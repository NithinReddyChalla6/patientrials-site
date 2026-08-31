import * as React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, FileText, Save } from 'lucide-react'
import { formsApi } from '@/data/api'
import type { FormCategory, FormType, StudyForm } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { pluralize } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { MultiSelect } from '@/components/ui/multi-select'
import { useToast } from '@/components/ui/toast'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { FormStatusBadge } from '@/components/patterns/status-badge'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

const FORM_TYPES: FormType[] = ['Intake', 'Screening', 'Follow-up', 'Safety', 'Unassigned']

const COPY: Record<
  FormCategory,
  { title: string; description: string; noun: string; emptyLibrary: string; libraryHref: string }
> = {
  form: {
    title: 'Forms',
    description:
      'Forms participants complete as part of this study. Only published forms can be assigned.',
    noun: 'forms',
    emptyLibrary:
      'Your form library has no published forms yet. Build and publish one, then assign it here.',
    libraryHref: '/forms',
  },
  survey: {
    title: 'Surveys',
    description:
      'Surveys sent to participants during this study. Only published surveys can be assigned.',
    noun: 'surveys',
    emptyLibrary:
      'Your library has no published surveys yet. Build and publish one, then assign it here.',
    libraryHref: '/surveys',
  },
}

/**
 * Assign forms or surveys to a study.
 *
 * Replaces the legacy slushbucket, where the available and assigned lists were
 * two adjacent multi-selects whose options were 32-character record ids, moved
 * between them by a button called "Add selected options to the...". Selection is
 * one searchable checklist here, changes are staged until saved, and the save
 * button says how many items will change.
 */
export function AssignmentTab({ category }: { category: FormCategory }) {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canAssign = can('form.assign')
  const copy = COPY[category]

  const library = useAsync(
    () => formsApi.list({ category, status: 'published' }),
    [category],
  )
  const [selected, setSelected] = React.useState<string[] | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Seed the working selection from the server state on first load.
  const assigned = React.useMemo(
    () => (library.data ?? []).filter((f) => f.assignedStudyIds.includes(study.id)).map((f) => f.id),
    [library.data, study.id],
  )

  React.useEffect(() => {
    if (library.data && selected === null) setSelected(assigned)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.data])

  const working = selected ?? assigned
  const added = working.filter((id) => !assigned.includes(id)).length
  const removed = assigned.filter((id) => !working.includes(id)).length
  const dirty = added + removed > 0

  async function save() {
    setSaving(true)
    try {
      await formsApi.setStudyAssignments(study.id, category, working)
      toast.success(
        `${copy.title} updated`,
        [
          added > 0 ? `${added} added` : null,
          removed > 0 ? `${removed} removed` : null,
        ]
          .filter(Boolean)
          .join(', '),
      )
      setSelected(null)
      library.reload()
    } catch (error) {
      toast.error(
        `We could not update ${copy.noun}`,
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{copy.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <AsyncBoundary
        state={library}
        loading={<Skeleton className="h-80" />}
        isEmpty={(items) => items.length === 0}
        empty={
          <div className="rounded-lg border border-dashed border-border bg-card">
            <EmptyState
              icon={category === 'form' ? FileText : ClipboardList}
              title={`No published ${copy.noun} to assign`}
              description={copy.emptyLibrary}
              action={
                <Button variant="brand" asChild>
                  <Link to={copy.libraryHref}>Open the library</Link>
                </Button>
              }
            />
          </div>
        }
        errorTitle={`We could not load your ${copy.noun}`}
      >
        {(items) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Available in your library
              </h3>
              <MultiSelect
                id={`assign-${category}`}
                label={copy.noun}
                options={items.map((form) => ({
                  value: form.id,
                  label: form.title,
                  description: [form.type, pluralize(countQuestions(form), 'question')].join(' · '),
                  meta: <FormStatusBadge status={form.status} />,
                }))}
                value={working}
                onChange={setSelected}
                disabled={!canAssign}
                searchPlaceholder={`Search ${copy.noun}`}
                emptyMessage={copy.emptyLibrary}
              />

              {canAssign && (
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <Button variant="brand" onClick={save} disabled={!dirty} loading={saving}>
                    <Save aria-hidden="true" />
                    Save changes
                  </Button>
                  {dirty ? (
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      {[added > 0 ? `${added} to add` : null, removed > 0 ? `${removed} to remove` : null]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No unsaved changes</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Assigned to this study
              </h3>
              <AssignedList
                items={items.filter((f) => assigned.includes(f.id))}
                category={category}
                canEdit={canAssign}
                onChanged={library.reload}
              />
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  )
}

function AssignedList({
  items,
  category,
  canEdit,
  onChanged,
}: {
  items: StudyForm[]
  category: FormCategory
  canEdit: boolean
  onChanged: () => void
}) {
  const toast = useToast()
  const [busyId, setBusyId] = React.useState<string>()

  async function setType(form: StudyForm, type: FormType) {
    setBusyId(form.id)
    try {
      await formsApi.setType(form.id, type)
      toast.success(`${form.title} set to ${type}`)
      onChanged()
    } catch {
      toast.error('We could not change the type', 'Please try again.')
    } finally {
      setBusyId(undefined)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card">
        <EmptyState
          compact
          icon={category === 'form' ? FileText : ClipboardList}
          title={`Nothing assigned yet`}
          description={`Select from your library to attach ${category === 'form' ? 'forms' : 'surveys'} to this study.`}
        />
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {items.map((form) => (
        <li key={form.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                to={`/forms/${form.id}`}
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {form.title}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pluralize(countQuestions(form), 'question')}
              </p>
            </div>
            <div className="w-40 shrink-0">
              <label htmlFor={`type-${form.id}`} className="sr-only">
                Type for {form.title}
              </label>
              <Select
                id={`type-${form.id}`}
                value={form.type}
                onChange={(e) => setType(form, e.target.value as FormType)}
                options={FORM_TYPES}
                disabled={!canEdit || busyId === form.id}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

const countQuestions = (form: StudyForm) =>
  form.sections.reduce((n, s) => n + s.questions.length, 0)
