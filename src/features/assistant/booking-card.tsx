import * as React from 'react'
import { CalendarPlus, Check, TriangleAlert, X } from 'lucide-react'
import { appointmentsApi, bookingsApi, locationsApi, subjectsApi, ApiError } from '@/data/api'
import type { BookingProposal } from '@/data/assistant'
import type { AppointmentTemplate, Subject } from '@/data/types'
import { APPOINTMENT_SLOTS } from '@/data/reference'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'

/**
 * The date with its weekday.
 *
 * A model asked for "next Tuesday" has returned a Saturday. The confirm step
 * only helps if the mistake is visible in it, and "Sep 12, 2026" is not — the
 * reader would have to know the calendar. "Saturday" beside it is checkable at
 * a glance.
 */
function withWeekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toLocaleDateString(undefined, { weekday: 'long' })}, ${formatDate(iso)}`
}

/** What a proposal turns into once it has been matched against the records. */
interface Resolved {
  subject: Subject
  template?: AppointmentTemplate
  date: string
  timeSlot: string
  locationId?: string
  locationName?: string
}

const normalise = (v: string) => v.trim().toLowerCase()

/**
 * The participants whose name the words could mean.
 *
 * Returns every match rather than the best one. "Okonkwo" naming two people is
 * not something to resolve by picking the first — a visit booked for the wrong
 * participant is worse than a question asked.
 */
function matchSubjects(subjects: Subject[], said: string): Subject[] {
  const q = normalise(said)
  if (!q) return []
  const exact = subjects.filter((s) => normalise(`${s.firstName} ${s.lastName}`) === q)
  if (exact.length) return exact
  return subjects.filter((s) => {
    const full = normalise(`${s.firstName} ${s.lastName}`)
    return (
      full.includes(q) ||
      normalise(s.firstName) === q ||
      normalise(s.lastName) === q ||
      normalise(s.id) === q
    )
  })
}

function matchTemplate(templates: AppointmentTemplate[], said?: string) {
  if (!said) return undefined
  const q = normalise(said)
  return (
    templates.find((t) => normalise(t.name) === q) ??
    templates.find((t) => normalise(t.name).includes(q) || q.includes(normalise(t.name)))
  )
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-foreground">{value}</span>
    </div>
  )
}

/**
 * What the assistant understood, before it becomes real.
 *
 * The proposal arrives as words. Everything shown here has been matched against
 * the study's own records first, so what you are agreeing to is the booking
 * itself and not the assistant's paraphrase of it. Anything that cannot be
 * matched — a name that fits nobody, or fits two people — stops here and says
 * so, because a booking made on a guess is the failure this card exists to
 * prevent.
 */
export function BookingCard({
  proposal,
  studyId,
  bookedBy,
  onBooked,
}: {
  proposal: BookingProposal
  studyId?: string
  bookedBy: string
  onBooked: (summary: string) => void
}) {
  const [resolved, setResolved] = React.useState<Resolved>()
  const [problem, setProblem] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)
  const [done, setDone] = React.useState<string>()
  const [cancelled, setCancelled] = React.useState(false)

  React.useEffect(() => {
    let live = true
    void (async () => {
      if (!studyId) {
        setProblem('Open a study first — I can only book a visit from inside one.')
        return
      }
      try {
        const [page, templates, locations] = await Promise.all([
          subjectsApi.list({ studyId, status: 'all', page: 1, pageSize: 200 }),
          appointmentsApi.list(studyId),
          locationsApi.list(studyId),
        ])
        if (!live) return

        const found = matchSubjects(page.items, proposal.participant)
        if (found.length === 0) {
          setProblem(`Nobody on this study matches "${proposal.participant}".`)
          return
        }
        if (found.length > 1) {
          setProblem(
            `"${proposal.participant}" matches ${found.length} participants. Say which one.`,
          )
          return
        }

        const template = matchTemplate(templates, proposal.visit)
        if (proposal.visit && !template) {
          setProblem(`This study has no visit called "${proposal.visit}".`)
          return
        }

        const slot =
          APPOINTMENT_SLOTS.find((s) => normalise(s) === normalise(proposal.time ?? '')) ??
          APPOINTMENT_SLOTS[1]
        const place = locations.find((l) => l.enabled)
        const inPerson = (template?.scheduleType ?? 'In person') === 'In person'

        setResolved({
          subject: found[0],
          template,
          date: proposal.date,
          timeSlot: slot,
          locationId: inPerson ? place?.id : undefined,
          locationName: inPerson ? place?.facilityName : undefined,
        })
      } catch {
        if (live) setProblem('I could not read this study to check that.')
      }
    })()
    return () => {
      live = false
    }
  }, [proposal, studyId])

  async function confirm() {
    if (!resolved || !studyId) return
    setSaving(true)
    try {
      await bookingsApi.add({
        studyId,
        subjectId: resolved.subject.id,
        templateId: resolved.template?.id,
        description: resolved.template?.name ?? 'Visit',
        scheduleType: resolved.template?.scheduleType ?? 'In person',
        withName: bookedBy,
        formIds: [],
        date: resolved.date,
        timeSlot: resolved.timeSlot,
        locationId: resolved.locationId,
      })
      const summary = `Booked ${resolved.subject.firstName} ${resolved.subject.lastName} for ${withWeekday(resolved.date)} at ${resolved.timeSlot}.`
      setDone(summary)
      onBooked(summary)
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'I could not make that booking.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-xs text-success">
        <Check className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {done}
      </p>
    )
  }

  if (cancelled) {
    return <p className="mt-2 text-xs text-muted-foreground">Nothing was booked.</p>
  }

  if (problem) {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" aria-hidden="true" />
        {problem}
      </p>
    )
  }

  if (!resolved) {
    return <p className="mt-2 text-xs text-muted-foreground">Checking that against the study…</p>
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <CalendarPlus className="size-3.5 text-brand" aria-hidden="true" />
        Book this visit?
      </p>

      <div className="mt-2 space-y-1">
        <Line
          label="Participant"
          value={
            <>
              {resolved.subject.firstName} {resolved.subject.lastName}{' '}
              <span className="id text-muted-foreground">{resolved.subject.id}</span>
            </>
          }
        />
        <Line label="Visit" value={resolved.template?.name ?? 'Not a protocol visit'} />
        <Line label="When" value={`${withWeekday(resolved.date)} at ${resolved.timeSlot}`} />
        {resolved.locationName && <Line label="Where" value={resolved.locationName} />}
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="brand" onClick={confirm} loading={saving}>
          <Check aria-hidden="true" />
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCancelled(true)} disabled={saving}>
          <X aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
