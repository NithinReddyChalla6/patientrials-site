import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Archive, FlaskConical, LayoutGrid, Rows3, Plus } from 'lucide-react'
import { siteApi, studiesApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import type { StudyStatus, StudyWithCounts } from '@/data/types'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton, SkeletonRows } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/patterns/page-header'
import { StatTile } from '@/components/patterns/stat-tile'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { NoResults } from '@/components/patterns/no-results'
import { DataGrid, type GridColumn } from '@/components/patterns/data-grid'
import { Pagination } from '@/components/ui/pagination'
import { RecruitmentBadge, StudyStatusBadge } from '@/components/patterns/status-badge'
import { formatCount, formatDate } from '@/lib/format'
import { useAuth } from '@/features/auth/auth-context'
import { StudyCard } from './study-card'

type Filter = 'all' | StudyStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'promoted', label: 'Promoted' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

const PAGE_SIZE = 25

/**
 * The studies list.
 *
 * A grid-first working screen: the toolbar, sort, column control, density,
 * export and bulk actions all live on the grid, and the card view is the
 * alternate for browsing rather than the default. The four status tiles are the
 * facet filter, carrying their counts and their pressed state.
 */
export function StudiesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const toast = useToast()

  const status = (params.get('status') as Filter | null) ?? 'all'
  const query = params.get('q') ?? ''
  const page = Number(params.get('page') ?? '1')
  const view = params.get('view') === 'cards' ? 'cards' : 'grid'
  const [searchValue, setSearchValue] = React.useState(query)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (searchValue) next.set('q', searchValue)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 250)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const counts = useAsync(() => studiesApi.counts(), [])
  const people = useAsync(() => siteApi.listCollaborators(), [])
  const studies = useAsync(
    () => studiesApi.list({ query, status, page, pageSize: PAGE_SIZE }),
    [query, status, page],
  )

  const patch = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(changes).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)))
        return next
      },
      { replace: true },
    )

  function clearFilters() {
    setSearchValue('')
    setParams({}, { replace: true })
  }

  const investigatorName = (study: StudyWithCounts) => {
    const person = people.data?.find((p) => p.id === study.principalInvestigatorId)
    return person ? `${person.firstName} ${person.lastName}` : ''
  }

  async function archiveMany(rows: StudyWithCounts[], clear: () => void) {
    setBusy(true)
    try {
      for (const row of rows) await studiesApi.setStatus(row.id, 'archived')
      toast.success(
        `${rows.length === 1 ? '1 study' : `${rows.length} studies`} archived`,
        'They no longer appear in your active list.',
      )
      clear()
      studies.reload()
      counts.reload()
    } catch (error) {
      toast.error(
        'We could not archive those studies',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const columns: GridColumn<StudyWithCounts>[] = [
    {
      key: 'id',
      header: 'Study ID',
      width: '11rem',
      sortable: true,
      value: (s) => s.id,
      cell: (s) => <span className="id font-medium text-foreground">{s.id}</span>,
    },
    {
      key: 'title',
      header: 'Study',
      width: 'minmax(10rem,2.5fr)',
      primary: true,
      sortable: true,
      value: (s) => s.title,
      cell: (s) => <span className="font-medium text-foreground">{s.title}</span>,
    },
    {
      key: 'nctId',
      header: 'NCT number',
      width: '9rem',
      sortable: true,
      value: (s) => s.nctId,
      cell: (s) => <span className="id text-muted-foreground">{s.nctId}</span>,
    },
    {
      key: 'condition',
      header: 'Condition',
      width: 'minmax(8rem,1fr)',
      sortable: true,
      value: (s) => s.condition,
      cell: (s) => s.condition,
    },
    {
      key: 'phase',
      header: 'Phase',
      width: '6rem',
      sortable: true,
      value: (s) => s.phase,
      cell: (s) => s.phase,
    },
    {
      key: 'sponsor',
      header: 'Sponsor',
      width: 'minmax(8rem,1fr)',
      sortable: true,
      defaultHidden: true,
      value: (s) => s.sponsor,
      cell: (s) => s.sponsor,
    },
    {
      key: 'pi',
      header: 'Investigator',
      width: 'minmax(9rem,1fr)',
      sortable: true,
      value: investigatorName,
      cell: (s) =>
        investigatorName(s) || <span className="text-warning">Not assigned</span>,
    },
    {
      key: 'recruitment',
      header: 'Recruitment',
      width: '11rem',
      sortable: true,
      value: (s) => s.recruitmentStatus,
      cell: (s) => <RecruitmentBadge status={s.recruitmentStatus} />,
    },
    {
      key: 'prospects',
      header: 'Prospects',
      width: '6rem',
      align: 'right',
      sortable: true,
      value: (s) => s.prospects,
      cell: (s) => formatCount(s.prospects),
    },
    {
      key: 'subjects',
      header: 'Subjects',
      width: '6rem',
      align: 'right',
      sortable: true,
      value: (s) => s.subjects,
      cell: (s) => formatCount(s.subjects),
    },
    {
      key: 'enrolment',
      header: 'Enrolment',
      width: '7rem',
      align: 'right',
      sortable: true,
      value: (s) => s.enrolled,
      cell: (s) =>
        s.enrollmentTarget > 0 ? (
          `${formatCount(s.enrolled)} / ${formatCount(s.enrollmentTarget)}`
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '7rem',
      sortable: true,
      value: (s) => s.status,
      cell: (s) => <StudyStatusBadge status={s.status} />,
    },
    {
      key: 'created',
      header: 'Created',
      width: '8rem',
      sortable: true,
      defaultHidden: true,
      hideOnCard: true,
      value: (s) => s.createdAt,
      cell: (s) => <span className="whitespace-nowrap">{formatDate(s.createdAt)}</span>,
    },
  ]

  const toolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchInput
        className="sm:w-80"
        label="Search studies"
        placeholder="Search title, ID, NCT, condition or sponsor"
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <div
        className="flex items-center gap-0.5 rounded-md border border-border p-0.5"
        role="group"
        aria-label="Result layout"
      >
        <Button
          variant={view === 'grid' ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={view === 'grid'}
          onClick={() => patch({ view: null })}
        >
          <Rows3 aria-hidden="true" />
          <span className="hidden lg:inline">Table</span>
        </Button>
        <Button
          variant={view === 'cards' ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={view === 'cards'}
          onClick={() => patch({ view: 'cards' })}
        >
          <LayoutGrid aria-hidden="true" />
          <span className="hidden lg:inline">Cards</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-4">
      <PageHeader
        title="Studies"
        description="Every study your site has taken on, from first promotion through to archive."
        actions={
          can('study.create') && (
            <Button id="create-study" variant="brand" asChild>
              <Link to="/studies/new">
                <Plus aria-hidden="true" />
                Create Study
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-2 sm:grid-cols-4">
        {FILTERS.map((filter) => (
          <StatTile
            key={filter.value}
            id={filter.value}
            label={filter.label}
            value={counts.data?.[filter.value] ?? '—'}
            selected={status === filter.value}
            onSelect={() => patch({ status: filter.value, page: null })}
          />
        ))}
      </div>

      <AsyncBoundary
        state={studies}
        loading={
          <div className="rounded-lg border border-border bg-card">
            <SkeletonRows rows={8} cols={6} />
          </div>
        }
        isEmpty={(data) => data.items.length === 0}
        empty={
          query || status !== 'all' ? (
            <div className="rounded-lg border border-border bg-card">
              <NoResults query={query} entity="studies" onClear={clearFilters} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={FlaskConical}
                title="No studies yet"
                description="Create a study from its NCT number to start screening and recruiting participants."
                action={
                  can('study.create') && (
                    <Button variant="brand" asChild>
                      <Link to="/studies/new">
                        <Plus aria-hidden="true" />
                        Create Study
                      </Link>
                    </Button>
                  )
                }
              />
            </div>
          )
        }
        errorTitle="We could not load your studies"
      >
        {(data) =>
          view === 'cards' ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-2">{toolbar}</div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {data.items.map((study) => (
                  <li key={study.id}>
                    <StudyCard
                      study={study}
                      investigator={people.data?.find(
                        (p) => p.id === study.principalInvestigatorId,
                      )}
                    />
                  </li>
                ))}
              </ul>
              <div className="rounded-lg border border-border bg-card">
                <Pagination
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  onPageChange={(next) => patch({ page: String(next) })}
                  itemLabel="study"
                />
              </div>
            </div>
          ) : (
            <DataGrid
              storageKey="studies"
              caption="Studies"
              columns={columns}
              rows={data.items}
              rowKey={(s) => s.id}
              onRowActivate={(s) => navigate(`/studies/${s.id}`)}
              selectable={can('study.archive')}
              exportName="studies"
              toolbar={toolbar}
              bulkActions={(selected, clear) => (
                <Button
                  variant="outline"
                  size="sm"
                  loading={busy}
                  onClick={() => archiveMany(selected, clear)}
                  disabled={selected.every((s) => s.status === 'archived')}
                >
                  <Archive aria-hidden="true" />
                  Archive
                </Button>
              )}
              footer={
                <Pagination
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  onPageChange={(next) => patch({ page: String(next) })}
                  itemLabel="study"
                />
              }
            />
          )
        }
      </AsyncBoundary>

      {people.isInitialLoading && <Skeleton className="h-1 w-full" />}
    </div>
  )
}
