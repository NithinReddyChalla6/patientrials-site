import {
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { appointmentsApi, bookingsApi, subjectsApi } from '@/data/api'
import type { Subject } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { StatTile } from '@/components/patterns/stat-tile'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { InferredNotice } from '@/components/patterns/inferred-notice'
import { useStudy } from './study-layout'
import { isActionable, visitsFor, type Visit, type VisitState } from './protocol-schedule'

/**
 * How each state reads and looks. One place, so grid, legend and list agree.
 *
 * Every state carries its own icon, not just its own colour. Six dots in one
 * column are only distinguishable by hue, and the three that matter most —
 * missed, off schedule, needs booking — sat next to each other in the warm end
 * of the palette, which made them the hardest three to tell apart at 10px.
 * Shape separates them; colour then says how bad each one is, and only the two
 * genuine failures are warm. Needing a booking is a job, not a failure, so it
 * reads as informational rather than as a third shade of alarm.
 */
const STATE: Record<
  VisitState,
  { label: string; hint: string; icon: LucideIcon; text: string }
> = {
  complete: {
    label: 'On time',
    hint: 'Happened within the allowed dates',
    icon: CheckCircle2,
    text: 'text-success',
  },
  deviation: {
    label: 'Off schedule',
    hint: 'Happened, but outside the allowed dates',
    icon: TriangleAlert,
    text: 'text-cta',
  },
  due: {
    label: 'Needs booking',
    hint: 'Can be booked now, and has not been',
    icon: Clock,
    text: 'text-info',
  },
  missed: {
    label: 'Missed',
    hint: 'The allowed dates passed with no visit',
    icon: XCircle,
    text: 'text-destructive',
  },
  upcoming: {
    label: 'Not due yet',
    hint: 'Nothing to do until its dates come round',
    icon: Circle,
    text: 'text-muted-foreground/60',
  },
  unknown: {
    label: 'No start date',
    hint: 'Recruited before enrolment dates were recorded',
    icon: CircleDashed,
    text: 'text-muted-foreground/60',
  },
}

const ORDER: VisitState[] = ['missed', 'deviation', 'due', 'upcoming', 'complete', 'unknown']

function fullName(subject: Subject) {
  return `${subject.firstName} ${subject.lastName}`
}

/** One cell of the grid: a dot a sighted reader scans, a sentence a screen reader hears. */
function VisitCell({ visit, subject }: { visit: Visit; subject: Subject }) {
  const { label, icon: Icon, text } = STATE[visit.state]
  const when = visit.booking
    ? `booked ${formatDate(visit.booking.date)}`
    : visit.dueOn
      ? `due ${formatDate(visit.dueOn)}`
      : 'no due date'

  return (
    <td className="border-l border-border px-3 py-2 text-center align-middle">
      {/* Hovering a mark explains it, so the legend is a reference and not a
          thing you have to keep going back to. */}
      <span
        className="inline-flex"
        title={`${visit.template.name}: ${label}, ${when}`}
      >
        <Icon className={`size-4 ${text}`} aria-hidden="true" />
      </span>
      <span className="sr-only">
        {fullName(subject)}, {visit.template.name}: {label}, {when}
      </span>
    </td>
  )
}

/**
 * Whether each participant's protocol visits are actually happening.
 *
 * A protocol states its visits relative to enrolment — "week 4, give or take
 * three days". The study's appointment templates hold that schedule and the
 * bookings hold what was arranged, but nothing compared the two, so a visit
 * could slip past its window with no trace. This screen is that comparison,
 * derived on read: no visit list is stored, so none can go stale.
 */
export function VisitComplianceTab() {
  const { study } = useStudy()
  const today = new Date().toISOString().slice(0, 10)

  const people = useAsync(
    () => subjectsApi.list({ studyId: study.id, status: 'recruited', page: 1, pageSize: 200 }),
    [study.id],
  )
  const templates = useAsync(() => appointmentsApi.list(study.id), [study.id])
  const bookings = useAsync(() => bookingsApi.listForStudy(study.id), [study.id])

  return (
    <AsyncBoundary
      state={people}
      loading={
        <div className="space-y-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      }
      errorTitle="We could not work out the visit schedule"
    >
      {(page) => {
        const schedule = [...(templates.data ?? [])]
        const allBookings = bookings.data ?? []
        const subjects = page.items

        const rows = subjects.map((subject) => ({
          subject,
          visits: visitsFor(subject, schedule, allBookings, today),
        }))

        const every = rows.flatMap((r) => r.visits)
        const count = (state: VisitState) => every.filter((v) => v.state === state).length
        const undated = subjects.filter((s) => !s.recruitedAt).length

        // Worst first, so the top of the list is the work that matters most.
        const attention = rows
          .map((row) => ({ ...row, flagged: row.visits.filter((v) => isActionable(v.state)) }))
          .filter((row) => row.flagged.length > 0)
          .sort(
            (a, b) =>
              ORDER.indexOf(a.flagged[0].state) - ORDER.indexOf(b.flagged[0].state) ||
              a.flagged[0].dueOn.localeCompare(b.flagged[0].dueOn),
          )

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Visit compliance</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Each recruited participant's protocol visits, measured from their own enrolment
                date, against what has actually been booked. A visit has a spread of dates it is
                allowed to happen in — set as its window on the appointment template — and one
                that happens outside that spread is a protocol deviation.
              </p>
            </div>

            <InferredNotice>
              Nothing here is stored. Every due date is the study's appointment templates counted
              from a participant's enrolment, so the picture stays right without anyone maintaining
              a separate visit list.
            </InferredNotice>

            {schedule.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={CalendarCheck}
                  title="No protocol schedule yet"
                  description="Add appointment templates to this study first — they are the schedule this screen checks against."
                />
              </div>
            ) : subjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={CalendarCheck}
                  title="Nobody recruited yet"
                  description="Protocol visits start counting from enrolment, so this fills in once participants are recruited."
                />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {/* Same four words as the legend and the grid. A tile called
                      one thing and a legend calling it another is how a reader
                      stops trusting either. */}
                  <StatTile
                    label={STATE.missed.label}
                    value={count('missed')}
                    hint={STATE.missed.hint}
                    icon={CalendarX}
                  />
                  <StatTile
                    label={STATE.due.label}
                    value={count('due')}
                    hint={STATE.due.hint}
                    icon={Clock}
                  />
                  <StatTile
                    label={STATE.deviation.label}
                    value={count('deviation')}
                    hint={STATE.deviation.hint}
                    icon={TriangleAlert}
                  />
                  <StatTile
                    label={STATE.complete.label}
                    value={count('complete')}
                    hint={STATE.complete.hint}
                    icon={CheckCircle2}
                  />
                </div>

                {undated > 0 && (
                  <Alert tone="warning" title="Some schedules cannot be worked out">
                    {undated === 1
                      ? '1 participant has no enrolment date, so nothing can be worked out for them.'
                      : `${undated} participants have no enrolment date, so nothing can be worked out for them.`}{' '}
                    The date is stamped when someone is recruited, so anyone recruited before this
                    screen existed will not have one.
                  </Alert>
                )}

                {attention.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Needs attention
                    </h3>
                    <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
                      {attention.map(({ subject, flagged }) => (
                        <li key={subject.id} className="flex flex-wrap items-start gap-4 p-4">
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning"
                            aria-hidden="true"
                          >
                            <TriangleAlert className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {fullName(subject)}
                              <span className="id ml-2 text-xs font-normal text-muted-foreground">
                                {subject.id}
                              </span>
                            </p>
                            <ul className="mt-1.5 flex flex-wrap gap-2">
                              {flagged.map((visit) => (
                                <li key={visit.template.id}>
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-sunken px-2.5 py-1 text-xs text-foreground">
                                    {(() => {
                                      const { icon: Icon, text } = STATE[visit.state]
                                      return (
                                        <Icon
                                          className={`size-3.5 shrink-0 ${text}`}
                                          aria-hidden="true"
                                        />
                                      )
                                    })()}
                                    {visit.template.name}
                                    <span className="text-muted-foreground">
                                      {visit.state === 'deviation' && visit.booking
                                        ? `${STATE.deviation.label.toLowerCase()} — happened ${formatDate(visit.booking.date)}`
                                        : `${STATE[visit.state].label.toLowerCase()} — due ${formatDate(visit.dueOn)}`}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <Badge
                            tone={
                              flagged.some((v) => v.state === 'missed')
                                ? 'danger'
                                : flagged.some((v) => v.state === 'deviation')
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {flagged.length === 1 ? '1 visit' : `${flagged.length} visits`}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Every participant, every visit
                  </h3>

                  {/* Each mark is spelled out rather than colour-coded alone: a
                      legend that only names hues is unusable to anyone who
                      cannot separate them, and unmemorable to everyone else. */}
                  <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ORDER.map((state) => {
                      const { label, hint, icon: Icon, text } = STATE[state]
                      return (
                        <li key={state} className="flex items-start gap-2 text-xs">
                          <Icon className={`mt-0.5 size-4 shrink-0 ${text}`} aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="font-medium text-foreground">{label}</span>
                            <span className="block text-muted-foreground">{hint}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  {/* Wide protocols scroll inside the card, never the page. */}
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full min-w-[36rem] border-collapse text-sm">
                      <caption className="sr-only">
                        Protocol visits for each recruited participant, read left to right in
                        protocol order.
                      </caption>
                      <thead>
                        <tr className="border-b border-border">
                          <th
                            scope="col"
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                          >
                            Participant
                          </th>
                          {rows[0].visits.map((visit) => (
                            <th
                              key={visit.template.id}
                              scope="col"
                              className="border-l border-border px-3 py-2.5 text-center text-xs font-medium text-muted-foreground"
                            >
                              {visit.template.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map(({ subject, visits }) => (
                          <tr key={subject.id}>
                            <th
                              scope="row"
                              className="max-w-[14rem] truncate px-4 py-2 text-left font-medium text-foreground"
                            >
                              {fullName(subject)}
                            </th>
                            {visits.map((visit) => (
                              <VisitCell
                                key={visit.template.id}
                                visit={visit}
                                subject={subject}
                              />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )
      }}
    </AsyncBoundary>
  )
}
