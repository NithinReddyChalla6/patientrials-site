import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, FileText, Plus } from 'lucide-react'
import { formsApi } from '@/data/api'
import type { FormCategory, FormStatus, StudyForm } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatRelative, pluralize } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { SkeletonRows } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { NoResults } from '@/components/patterns/no-results'
import { DataGrid, type GridColumn } from '@/components/patterns/data-grid'
import { FormStatusBadge } from '@/components/patterns/status-badge'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/auth-context'

const questionCount = (f: StudyForm) =>
  f.sections.reduce((n, sec) => n + sec.questions.length, 0)

const COPY: Record<FormCategory, { title: string; description: string; noun: string }> = {
  form: {
    title: 'Forms',
    description:
      'Forms your participants complete during a study. Build one here, then assign it to the studies that need it.',
    noun: 'form',
  },
  survey: {
    title: 'Surveys',
    description:
      'Surveys sent to participants between visits. Build one here, then assign it to the studies that need it.',
    noun: 'survey',
  },
}

/**
 * The form and survey library.
 *
 * The legacy screen relied on a URL fragment (`#draft`) for its state and opened
 * the builder in a popup window. Draft and published are a real tab control
 * here, the counts are visible before you switch, and the builder is a page.
 */
export function FormsLibraryPage({ category }: { category: FormCategory }) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const copy = COPY[category]

  const [status, setStatus] = React.useState<'all' | FormStatus>('all')
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 250)
    return () => window.clearTimeout(id)
  }, [query])

  const all = useAsync(() => formsApi.list({ category }), [category])
  const state = useAsync(
    () => formsApi.list({ category, status, query: debounced }),
    [category, status, debounced],
  )

  const counts = {
    all: all.data?.length ?? 0,
    draft: all.data?.filter((f) => f.status === 'draft').length ?? 0,
    published: all.data?.filter((f) => f.status === 'published').length ?? 0,
  }

  const columns: GridColumn<StudyForm>[] = [
    {
      key: 'title',
      header: copy.title.slice(0, -1),
      width: 'minmax(0,2fr)',
      primary: true,
      sortable: true,
      value: (f) => f.title,
      cell: (f) => <span className="font-medium text-foreground">{f.title}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      width: '8rem',
      sortable: true,
      value: (f) => f.type,
      cell: (f) => <Badge tone="outline">{f.type}</Badge>,
    },
    {
      key: 'questions',
      header: 'Questions',
      width: '7rem',
      align: 'right',
      sortable: true,
      value: questionCount,
      cell: questionCount,
    },
    {
      key: 'sections',
      header: 'Sections',
      width: '7rem',
      align: 'right',
      sortable: true,
      defaultHidden: true,
      value: (f) => f.sections.length,
      cell: (f) => f.sections.length,
    },
    {
      key: 'status',
      header: 'Status',
      width: '8rem',
      sortable: true,
      value: (f) => f.status,
      cell: (f) => <FormStatusBadge status={f.status} />,
    },
    {
      key: 'assigned',
      header: 'Assigned to',
      width: '9rem',
      sortable: true,
      value: (f) => f.assignedStudyIds.length,
      cell: (f) =>
        f.assignedStudyIds.length > 0 ? (
          pluralize(f.assignedStudyIds.length, 'study', 'studies')
        ) : (
          <span className="text-muted-foreground">Not assigned</span>
        ),
    },
    {
      key: 'updated',
      header: 'Last edited',
      width: '9rem',
      sortable: true,
      hideOnCard: true,
      value: (f) => f.updatedAt,
      cell: (f) => <span className="whitespace-nowrap">{formatRelative(f.updatedAt)}</span>,
    },
  ]

  const createHref = `/${category === 'form' ? 'forms' : 'surveys'}/new`

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          can('form.create') && (
            <Button variant="brand" asChild>
              <Link to={createHref}>
                <Plus aria-hidden="true" />
                Create {copy.noun}
              </Link>
            </Button>
          )
        }
      />

      <AsyncBoundary
        state={state}
        loading={
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <SkeletonRows rows={4} cols={4} />
          </div>
        }
        isEmpty={(items) => items.length === 0}
        empty={
          debounced || status !== 'all' ? (
            <div className="rounded-lg border border-border bg-card">
              <NoResults
                query={debounced}
                entity={`${copy.noun}s`}
                onClear={() => {
                  setQuery('')
                  setStatus('all')
                }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={category === 'form' ? FileText : ClipboardList}
                title={`No ${copy.noun}s yet`}
                description={`Build a ${copy.noun} once and assign it to as many studies as you need.`}
                action={
                  can('form.create') && (
                    <Button variant="brand" asChild>
                      <Link to={createHref}>
                        <Plus aria-hidden="true" />
                        Create {copy.noun}
                      </Link>
                    </Button>
                  )
                }
              />
            </div>
          )
        }
        errorTitle={`We could not load your ${copy.noun}s`}
      >
        {(items) => (
          <DataGrid
            storageKey={`forms-${category}`}
            caption={copy.title}
            columns={columns}
            rows={items}
            rowKey={(f) => f.id}
            onRowActivate={(f) => navigate(`/${category === 'form' ? 'forms' : 'surveys'}/${f.id}`)}
            exportName={`${copy.noun}s`}
            toolbar={
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Tabs value={status} onValueChange={(v) => setStatus(v as 'all' | FormStatus)}>
                  <TabsList>
                    <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                    <TabsTrigger value="draft">Drafts ({counts.draft})</TabsTrigger>
                    <TabsTrigger value="published">Published ({counts.published})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <SearchInput
                  className="sm:w-64"
                  label={`Search ${copy.noun}s`}
                  placeholder={`Search ${copy.noun}s`}
                  value={query}
                  onValueChange={setQuery}
                />
              </div>
            }
          />
        )}
      </AsyncBoundary>
    </div>
  )
}
