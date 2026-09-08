import type { Appointment, AppointmentTemplate, Subject } from '@/data/types'

/**
 * Where a protocol visit stands for one participant.
 *
 * The distinction that matters is `deviation` versus `missed`: a visit that
 * happened outside its window and a visit that never happened are both protocol
 * deviations, but the first is a scheduling problem and the second is a
 * retention problem. Collapsing them would hide which one a site actually has.
 */
export type VisitState =
  | 'complete'
  | 'deviation'
  | 'due'
  | 'missed'
  | 'upcoming'
  /** No enrolment date, so no due date can be worked out. */
  | 'unknown'

export interface Visit {
  template: AppointmentTemplate
  /** ISO `yyyy-mm-dd`. Empty when the state is `unknown`. */
  dueOn: string
  windowOpens: string
  windowCloses: string
  /** The booking that satisfies this visit, if one has been made. */
  booking?: Appointment
  state: VisitState
}

const DAY_MS = 86_400_000

/** The `yyyy-mm-dd` part of an ISO timestamp or date. */
export function isoDay(value: string): string {
  return value.slice(0, 10)
}

/** `day` moved by `days`, staying in UTC so a local timezone cannot shift it. */
function shift(day: string, days: number): string {
  const t = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(t)) return day
  return new Date(t + days * DAY_MS).toISOString().slice(0, 10)
}

/**
 * Days from enrolment to this visit.
 *
 * The template form states week and day are "counted from the day a participant
 * enrols", so week 1 day 1 is enrolment day itself — hence both are offset by
 * one rather than multiplied straight out.
 */
export function offsetDays(template: AppointmentTemplate): number {
  const week = Number(template.week) || 1
  const day = Number(template.day) || 1
  return (week - 1) * 7 + (day - 1)
}

/** Protocol order: the visit that comes first in the schedule comes first here. */
export function byProtocolOrder(a: AppointmentTemplate, b: AppointmentTemplate): number {
  return offsetDays(a) - offsetDays(b) || a.name.localeCompare(b.name)
}

/**
 * Every protocol visit for one participant, and how each one stands today.
 *
 * Nothing here is stored. The schedule is the study's templates measured from
 * this participant's own enrolment date, compared against what has actually
 * been booked — so it cannot drift the way a copied-out visit list would.
 *
 * A `Recurring` template is treated as a single occurrence at its offset: the
 * model records no repeat interval, and inventing one (weekly, say) would put
 * confident wrong dates in front of a coordinator.
 */
export function visitsFor(
  subject: Subject,
  templates: AppointmentTemplate[],
  bookings: Appointment[],
  today: string,
): Visit[] {
  const mine = bookings.filter((b) => b.subjectId === subject.id)

  return [...templates].sort(byProtocolOrder).map((template) => {
    const booking = mine.find((b) => b.templateId === template.id)

    if (!subject.recruitedAt) {
      return {
        template,
        dueOn: '',
        windowOpens: '',
        windowCloses: '',
        booking,
        state: 'unknown' as const,
      }
    }

    const dueOn = shift(isoDay(subject.recruitedAt), offsetDays(template))
    const slack = Math.max(0, template.windowDays ?? 0)
    const windowOpens = shift(dueOn, -slack)
    const windowCloses = shift(dueOn, slack)

    let state: VisitState
    if (booking) {
      state = booking.date >= windowOpens && booking.date <= windowCloses ? 'complete' : 'deviation'
    } else if (today > windowCloses) {
      state = 'missed'
    } else if (today >= windowOpens) {
      state = 'due'
    } else {
      state = 'upcoming'
    }

    return { template, dueOn, windowOpens, windowCloses, booking, state }
  })
}

/** States that are somebody's problem right now, worst first. */
export const ACTIONABLE: VisitState[] = ['missed', 'deviation', 'due']

/** True when the visit needs someone to do something about it. */
export function isActionable(state: VisitState): boolean {
  return ACTIONABLE.includes(state)
}
