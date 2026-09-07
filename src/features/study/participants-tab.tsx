import * as React from 'react'
import { CircleSlash, ThumbsUp, UserCheck, Users } from 'lucide-react'
import { subjectsApi } from '@/data/api'
import type { Subject, SubjectStatus, TriageAction } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { cn } from '@/lib/cn'
import { formatDate, formatRelative } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { SkeletonRows } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { SidePanel } from '@/components/ui/side-panel'
import { useToast } from '@/components/ui/toast'
import { StatTile } from '@/components/patterns/stat-tile'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { NoResults } from '@/components/patterns/no-results'
import { DataGrid, type GridColumn } from '@/components/patterns/data-grid'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { SubjectStatusBadge } from '@/components/patterns/status-badge'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'
import { SubjectDetail } from './subject-detail'
import { SubjectCards } from './subject-cards'
import { bookingsApi } from '@/data/api'
import { LayoutGrid, Rows3 } from 'lucide-react'

type Filter = SubjectStatus | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'New Subjects' },
  { value: 'validated', label: 'Validated' },
  { value: 'prescreened', label: 'Pre-screened' },
  { value: 'recruited', label: 'Recruited' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'all', label: 'All' },
]

const PAGE_SIZE = 25

/** Cards for recognising one person, the table for working through a batch. */
function ViewToggle({
  view,
  onChange,
}: {
  view: 'cards' | 'table'
  onChange: (next: 'cards' | 'table') => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="View">
      <Button
        variant={view === 'cards' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('cards')}
        aria-pressed={view === 'cards'}
      >
        <LayoutGrid aria-hidden="true" />
        Cards
      </Button>
      <Button
        variant={view === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('table')}
        aria-pressed={view === 'table'}
      >
        <Rows3 aria-hidden="true" />
        Table
      </Button>
    </div>
  )
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[0.6875rem] text-foreground">
        {keys}
      </kbd>
      {label}
    </span>
  )
}

/** How many pre-screening answers differ from what the study asked for. */
const mismatches = (subject: Subject) =>
  subject.prescreeningAnswers.filter((a) => a.desired && a.answer !== a.desired).length

const ACTION_COPY: Record<TriageAction, { verb: string; past: string; note?: string }> = {
  validated: { verb: 'Validate', past: 'validated' },
  recruited: {
    verb: 'Recruit',
    past: 'recruited',
    note: 'They will count towards your enrolment target.',
  },
  rejected: {
    verb: 'Reject',
    past: 'rejected',
    note: 'They will be marked not eligible and removed from your screening queue.',
  },
}

/**
 * Participant screening queue.
 *
 * Screening arrives in batches, so the grid supports batch decisions: select
 * rows, choose Validate / Recruit / Reject once, confirm what will change. The
 * legacy flow cost four navigations per person and returned you to the studies
 * index each time.
 *
 * A single record still opens in a quick-view panel beside the list, so
 * reviewing one participant never loses your place in the queue.
 */
export function ParticipantsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canTriage = can('subject.triage')

  const [filter, setFilter] = React.useState<Filter>('pending')
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [openSubject, setOpenSubject] = React.useState<Subject | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState<{
    status: TriageAction
    rows: Subject[]
    clear: () => void
  } | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([])

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(query)
      setPage(1)
    }, 250)
    return () => window.clearTimeout(id)
  }, [query])

  const [view, setView] = React.useState<'cards' | 'table'>('cards')
  const bookings = useAsync(() => bookingsApi.listForStudy(study.id), [study.id])
  const counts = useAsync(() => subjectsApi.counts(study.id), [study.id])
  const list = useAsync(
    () =>
      subjectsApi.list({
        studyId: study.id,
        query: debounced,
        status: filter,
        page,
        pageSize: PAGE_SIZE,
      }),
    [study.id, debounced, filter, page],
  )

  async function apply(status: TriageAction, rows: Subject[], clear: () => void) {
    setBusy(true)
    try {
      const changed = await subjectsApi.setStatusMany(
        rows.map((r) => r.id),
        status,
      )
      const copy = ACTION_COPY[status]
      toast.success(
        changed.length === 1
          ? `1 participant ${copy.past}`
          : `${changed.length} participants ${copy.past}`,
        changed.length < rows.length
          ? `${rows.length - changed.length} were already ${copy.past}.`
          : copy.note,
      )
      clear()
      setConfirm(null)
      setOpenSubject(null)
      list.reload()
      counts.reload()
    } catch (error) {
      toast.error(
        'We could not save those decisions',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const rows = list.data?.items ?? []
  const activeRow = rows[Math.min(activeIndex, Math.max(rows.length - 1, 0))]

  React.useEffect(() => setActiveIndex(0), [rows.length, filter, debounced, page])

  /**
   * Keyboard triage.
   *
   * Screening is the highest-volume repetitive task in the console, so it gets
   * a hands-on-keyboard path: j/k to move, v/r/x to decide, Enter to open the
   * record. A decision applies to the current selection when there is one, and
   * to the focused row otherwise.
   */
  React.useEffect(() => {
    if (!canTriage) return

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      // A dialog or side panel owns the keyboard while it is open.
      if (document.querySelector('[role="dialog"]')) return
      if (rows.length === 0) return

      const targets =
        selectedKeys.length > 0
          ? rows.filter((r) => selectedKeys.includes(r.id))
          : activeRow
            ? [activeRow]
            : []

      const decide = (status: TriageAction) => {
        if (targets.length === 0) return
        e.preventDefault()
        setConfirm({ status, rows: targets, clear: () => setSelectedKeys([]) })
      }

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault()
          setActiveIndex((i) => Math.min(i + 1, rows.length - 1))
          break
        case 'k':
        case 'arrowup':
          e.preventDefault()
          setActiveIndex((i) => Math.max(i - 1, 0))
          break
        case 'enter':
          if (activeRow) {
            e.preventDefault()
            setOpenSubject(activeRow)
          }
          break
        case 'v':
          decide('validated')
          break
        case 'r':
          decide('recruited')
          break
        case 'x':
          decide('rejected')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canTriage, rows, activeRow, selectedKeys])

  const columns: GridColumn<Subject>[] = [
    {
      key: 'id',
      header: 'Participant ID',
      width: '9rem',
      sortable: true,
      value: (s) => s.id,
      cell: (s) => <span className="id font-medium text-foreground">{s.id}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      width: 'minmax(0,1.4fr)',
      primary: true,
      sortable: true,
      value: (s) => `${s.lastName} ${s.firstName}`,
      cell: (s) => (
        <span className="font-medium text-foreground">
          {s.firstName} {s.lastName}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      width: 'minmax(0,1fr)',
      sortable: true,
      value: (s) => s.city,
      cell: (s) => `${s.city} ${s.zipcode}`,
    },
    {
      key: 'email',
      header: 'Email',
      width: 'minmax(0,1.4fr)',
      sortable: true,
      defaultHidden: true,
      value: (s) => s.email,
      cell: (s) => <span className="truncate text-muted-foreground">{s.email}</span>,
    },
    {
      key: 'language',
      header: 'Language',
      width: '8rem',
      sortable: true,
      defaultHidden: true,
      value: (s) => s.primaryLanguage,
      cell: (s) => s.primaryLanguage,
    },
    {
      key: 'screening',
      header: 'Pre-screening',
      width: '10rem',
      sortable: true,
      value: (s) => mismatches(s),
      cell: (s) => {
        const n = mismatches(s)
        return n === 0 ? (
          <span className="text-success">All matched</span>
        ) : (
          <span className="text-warning">
            {n} mismatch{n === 1 ? '' : 'es'}
          </span>
        )
      },
    },
    {
      key: 'created',
      header: 'Signed up',
      width: '9rem',
      sortable: true,
      value: (s) => s.createdAt,
      cell: (s) => <span className="whitespace-nowrap">{formatRelative(s.createdAt)}</span>,
    },
    {
      key: 'dob',
      header: 'Date of birth',
      width: '9rem',
      sortable: true,
      defaultHidden: true,
      hideOnCard: true,
      value: (s) => s.dateOfBirth,
      cell: (s) => formatDate(s.dateOfBirth),
    },
    {
      key: 'status',
      header: 'Status',
      width: '10rem',
      sortable: true,
      value: (s) => s.status,
      cell: (s) => <SubjectStatusBadge status={s.status} />,
    },
  ]

  function clearFilters() {
    setQuery('')
    setFilter('all')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {FILTERS.map((f) => (
          <StatTile
            key={f.value}
            label={f.label}
            value={counts.data?.[f.value] ?? '—'}
            selected={filter === f.value}
            onSelect={() => {
              setFilter(f.value)
              setPage(1)
            }}
          />
        ))}
      </div>

      <AsyncBoundary
        state={list}
        loading={
          <div className="rounded-lg border border-border bg-card">
            <SkeletonRows rows={8} cols={5} />
          </div>
        }
        isEmpty={(data) => data.items.length === 0}
        empty={
          debounced || filter !== 'all' ? (
            <div className="rounded-lg border border-border bg-card">
              <NoResults query={debounced} entity="participants" onClear={clearFilters} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={Users}
                title="No participants yet"
                description={
                  study.status === 'promoted'
                    ? 'This study is promoted, so participants who find it and complete sign-up will appear here.'
                    : 'Promote this study so participants can find it and sign up, or add them yourself.'
                }
              />
            </div>
          )
        }
        errorTitle="We could not load participants"
      >
        {(data) =>
          view === 'cards' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SearchInput
                  className="sm:w-80"
                  label="Search participants"
                  placeholder="Search name, participant ID, email or city"
                  value={query}
                  onValueChange={setQuery}
                />
                <ViewToggle view={view} onChange={setView} />
              </div>

              <SubjectCards
                subjects={data.items}
                appointments={bookings.data ?? []}
                onOpen={setOpenSubject}
              />

              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={setPage}
                itemLabel="participant"
              />
            </div>
          ) : (
          <DataGrid
            storageKey="participants"
            caption="Participants"
            columns={columns}
            rows={data.items}
            rowKey={(s) => s.id}
            onRowActivate={setOpenSubject}
            selectable={canTriage}
            activeRowKey={activeRow?.id}
            onSelectionChange={setSelectedKeys}
            exportName={`participants-${study.id}`}
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                  className="sm:w-80"
                  label="Search participants"
                  placeholder="Search name, participant ID, email or city"
                  value={query}
                  onValueChange={setQuery}
                />
                <ViewToggle view={view} onChange={setView} />
              </div>
            }
            bulkActions={(selected, clear) => (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirm({ status: 'validated', rows: selected, clear })}
                >
                  <UserCheck aria-hidden="true" />
                  Validate
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => setConfirm({ status: 'recruited', rows: selected, clear })}
                >
                  <ThumbsUp aria-hidden="true" />
                  Recruit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirm({ status: 'rejected', rows: selected, clear })}
                >
                  <CircleSlash aria-hidden="true" />
                  Reject
                </Button>
              </>
            )}
            footer={
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={setPage}
                itemLabel="participant"
              />
            }
          />
          )
        }
      </AsyncBoundary>

      {canTriage ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Keyboard</span>
          <Shortcut keys="J K" label="Move" />
          <Shortcut keys="V" label="Validate" />
          <Shortcut keys="R" label="Recruit" />
          <Shortcut keys="X" label="Reject" />
          <Shortcut keys="↵" label="Open record" />
          <span>Acts on your selection, or the focused row.</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can review participants but not change their status. Ask a coordinator or
          administrator to validate, recruit or reject.
        </p>
      )}

      <SidePanel
        open={Boolean(openSubject)}
        onOpenChange={(next) => !next && setOpenSubject(null)}
        title={openSubject ? `${openSubject.firstName} ${openSubject.lastName}` : ''}
        description={openSubject ? <span className="id">{openSubject.id}</span> : undefined}
        className="max-w-lg"
      >
        {openSubject && (
          <SubjectDetail
            subject={openSubject}
            canTriage={canTriage}
            busy={busy}
            onAction={(status) => apply(status, [openSubject], () => setOpenSubject(null))}
          />
        )}
      </SidePanel>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={
          confirm
            ? `${ACTION_COPY[confirm.status].verb} ${
                confirm.rows.length === 1
                  ? '1 participant'
                  : `${confirm.rows.length} participants`
              }?`
            : ''
        }
        description={
          confirm ? (
            <>
              {ACTION_COPY[confirm.status].note ??
                'They will move to the next stage of screening.'}{' '}
              You can change this again afterwards.
            </>
          ) : (
            ''
          )
        }
        confirmLabel={confirm ? ACTION_COPY[confirm.status].verb : 'Confirm'}
        destructive={confirm?.status === 'rejected'}
        loading={busy}
        onConfirm={() => confirm && apply(confirm.status, confirm.rows, confirm.clear)}
      >
        {confirm && (
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {confirm.rows.slice(0, 20).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-foreground">
                  {row.firstName} {row.lastName}
                </span>
                <span className={cn('id shrink-0 text-xs text-muted-foreground')}>{row.id}</span>
              </li>
            ))}
            {confirm.rows.length > 20 && (
              <li className="text-xs text-muted-foreground">
                and {confirm.rows.length - 20} more
              </li>
            )}
          </ul>
        )}
      </ConfirmDialog>
    </div>
  )
}
