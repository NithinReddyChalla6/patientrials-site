import { CalendarClock, CheckCircle2, ClipboardCheck, UserRound } from 'lucide-react'
import { bookingsApi, subjectsApi } from '@/data/api'
import type { Appointment, Subject } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { InferredNotice } from '@/components/patterns/inferred-notice'
import { useStudy } from './study-layout'

interface Task {
  /** Who the task is waiting on. */
  owner: 'site' | 'participant'
  label: string
}

/**
 * What is outstanding for each participant.
 *
 * There is no task record in this build, so nothing is stored: the list is
 * derived from the state the study is already in. A participant waiting on a
 * screening decision is work for the site; a booked visit is work for them.
 * Deriving it means the list cannot drift out of date the way a separate task
 * table would.
 */
function tasksFor(subject: Subject, appointments: Appointment[], today: string): Task[] {
  const tasks: Task[] = []

  if (subject.status === 'pending') {
    tasks.push({ owner: 'site', label: 'Awaiting screening decision' })
  }
  if (subject.status === 'validated') {
    tasks.push({ owner: 'site', label: 'Validated, awaiting a recruitment decision' })
  }
  if (subject.status === 'prescreened') {
    tasks.push({ owner: 'site', label: 'Pre-screened, awaiting a recruitment decision' })
  }

  const upcoming = appointments
    .filter((a) => a.subjectId === subject.id && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (upcoming.length > 0) {
    const next = upcoming[0]
    tasks.push({
      owner: 'participant',
      label: `Visit on ${formatDate(next.date)} at ${next.timeSlot}`,
    })
  }

  return tasks
}

export function PendingTasksTab() {
  const { study } = useStudy()
  const today = new Date().toISOString().slice(0, 10)

  const list = useAsync(
    () => subjectsApi.list({ studyId: study.id, status: 'all', page: 1, pageSize: 200 }),
    [study.id],
  )
  const bookings = useAsync(() => bookingsApi.listForStudy(study.id), [study.id])

  return (
    <AsyncBoundary
      state={list}
      loading={
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40" />
        </div>
      }
      errorTitle="We could not work out what is outstanding"
    >
      {(page) => {
        const appointments = bookings.data ?? []
        const rows = page.items
          .map((subject) => ({ subject, tasks: tasksFor(subject, appointments, today) }))
          .filter((row) => row.tasks.length > 0)

        const onSite = rows.filter((r) => r.tasks.some((t) => t.owner === 'site')).length

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Pending tasks</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                What is still outstanding for each participant on this study, and who it is waiting
                on.
              </p>
            </div>

            <InferredNotice>
              Nothing here is stored as a task. Each line is worked out from the study's current
              state, so it stays accurate without anyone maintaining a separate list.
            </InferredNotice>

            <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {rows.length === 0
                ? 'Nothing outstanding'
                : `${rows.length} with something outstanding, ${onSite} waiting on the site`}
            </h3>

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={CheckCircle2}
                  title="Nothing outstanding"
                  description="No participant is waiting on a decision or has a visit booked."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {rows.map(({ subject, tasks }) => (
                  <li key={subject.id} className="flex flex-wrap items-start gap-4 p-4">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                      aria-hidden="true"
                    >
                      <UserRound className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {subject.firstName} {subject.lastName}
                        <span className="id ml-2 text-xs font-normal text-muted-foreground">
                          {subject.id}
                        </span>
                      </p>
                      <ul className="mt-1.5 flex flex-wrap gap-2">
                        {tasks.map((task) => (
                          <li key={task.label}>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-sunken px-2.5 py-1 text-xs text-foreground">
                              {task.owner === 'site' ? (
                                <ClipboardCheck className="size-3.5 text-warning" aria-hidden="true" />
                              ) : (
                                <CalendarClock className="size-3.5 text-brand" aria-hidden="true" />
                              )}
                              {task.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Badge tone={tasks.some((t) => t.owner === 'site') ? 'warning' : 'neutral'}>
                      {tasks.some((t) => t.owner === 'site') ? 'On the site' : 'On the participant'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }}
    </AsyncBoundary>
  )
}
