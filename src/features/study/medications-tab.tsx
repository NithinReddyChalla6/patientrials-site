import * as React from 'react'
import { Pill, Plus, X } from 'lucide-react'
import { medicationsApi, ApiError } from '@/data/api'
import type { Medication } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/**
 * The medications a study can prescribe.
 *
 * Defined once here, then chosen by name when prescribing to a participant, so
 * the same drug cannot be spelled three ways across three courses. Removing one
 * is refused while anyone is still prescribed it.
 */
export function MedicationsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('medication.manage')

  const state = useAsync(() => medicationsApi.list(study.id), [study.id])
  const [panel, setPanel] = React.useState<'closed' | 'new' | string>('closed')
  const [busyId, setBusyId] = React.useState<string>()

  async function remove(medication: Medication) {
    setBusyId(medication.id)
    try {
      await medicationsApi.remove(medication.id)
      toast.success('Medication removed')
      state.reload()
    } catch (error) {
      toast.error(
        'We could not remove this medication',
        error instanceof ApiError ? error.message : 'Please try again.',
      )
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <AsyncBoundary
      state={state}
      loading={
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40" />
        </div>
      }
      errorTitle="We could not load this study's medications"
    >
      {(medications) => {
        const editing = medications.find((m) => m.id === panel)

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Medications</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                The medications this study prescribes. Add one here first, then prescribe it to a
                participant from their record.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {medications.length === 0 ? 'None added' : `${medications.length} added`}
              </h3>
              {canManage && panel === 'closed' && (
                <Button variant="outline" size="sm" onClick={() => setPanel('new')}>
                  <Plus aria-hidden="true" />
                  Add medication
                </Button>
              )}
            </div>

            {medications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={Pill}
                  title="No medications yet"
                  description="Add the study drug and any supporting medications before prescribing."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {medications.map((medication) => (
                  <li key={medication.id} className="flex flex-wrap items-start gap-4 p-4">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                      aria-hidden="true"
                    >
                      <Pill className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => setPanel(medication.id)}
                            className="rounded text-left underline-offset-4 hover:underline"
                          >
                            {medication.name}
                          </button>
                        ) : (
                          medication.name
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {medication.description}
                      </p>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(medication)}
                        disabled={busyId === medication.id}
                        aria-label={`Remove ${medication.name}`}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage && panel !== 'closed' && (
              <MedicationPanel
                key={panel}
                studyId={study.id}
                editing={editing}
                onDone={() => {
                  setPanel('closed')
                  state.reload()
                }}
                onCancel={() => setPanel('closed')}
              />
            )}
          </div>
        )
      }}
    </AsyncBoundary>
  )
}

function MedicationPanel({
  studyId,
  editing,
  onDone,
  onCancel,
}: {
  studyId: string
  editing?: Medication
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [serverError, setServerError] = React.useState<string>()

  const form = useForm({
    initialValues: {
      name: editing?.name ?? '',
      description: editing?.description ?? '',
    },
    rules: {
      name: required('Name'),
      description: required('Description'),
    },
    onSubmit: async (values) => {
      setServerError(undefined)
      try {
        if (editing) {
          await medicationsApi.update(editing.id, values)
          toast.success('Medication updated')
        } else {
          await medicationsApi.add({ studyId, ...values })
          toast.success('Medication added')
        }
        onDone()
      } catch (error) {
        setServerError(
          error instanceof ApiError ? error.message : 'We could not save this medication.',
        )
      }
    },
  })

  const heading = editing ? 'Edit medication' : 'Add medication'

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label={`Cancel ${heading}`}>
          <X aria-hidden="true" />
        </Button>
      </div>

      <form className="space-y-6" onSubmit={form.submit} noValidate>
        {serverError && (
          <Alert tone="error" title="We could not save this medication">
            {serverError}
          </Alert>
        )}

        <FormSection title="Medication">
          <FullWidth>
            <FormField id="medicationName" label="Name" error={form.errors.name} required>
              {(aria) => <Input {...aria} {...form.field('name')} autoComplete="off" />}
            </FormField>
          </FullWidth>

          <FullWidth>
            <FormField
              id="medicationDescription"
              label="Description"
              hint="How it is taken, and what it is for."
              error={form.errors.description}
              required
            >
              {(aria) => <Textarea {...aria} {...form.field('description')} rows={3} />}
            </FormField>
          </FullWidth>
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="brand" loading={form.submitting}>
            {editing ? 'Save changes' : 'Save medication'}
          </Button>
        </div>
      </form>
    </div>
  )
}
