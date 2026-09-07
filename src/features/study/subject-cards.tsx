import { Pill, UserRound } from 'lucide-react'
import type { Appointment, Subject } from '@/data/types'
import { formatDate } from '@/lib/format'
import { SubjectStatusBadge } from '@/components/patterns/status-badge'

/** Age in whole years, or undefined when the date of birth is missing. */
function ageFrom(dateOfBirth: string): number | undefined {
  if (!dateOfBirth) return undefined
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value || '—'}</dd>
    </div>
  )
}

/**
 * Participants as cards.
 *
 * The table is better for triaging a batch; this is better for recognising one
 * person, which is what the investigator is usually doing. Both read the same
 * list, so the filters and search above apply either way.
 */
export function SubjectCards({
  subjects,
  appointments,
  onOpen,
}: {
  subjects: Subject[]
  /** Every booking for the study, so each card can show its own without refetching. */
  appointments: Appointment[]
  onOpen: (subject: Subject) => void
}) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject) => {
        const mine = appointments
          .filter((a) => a.subjectId === subject.id)
          .sort((a, b) => a.date.localeCompare(b.date))
        // `mine` is sorted by date, so the last past one is simply the final entry.
        const last = mine.filter((a) => a.date < today).at(-1)
        const next = mine.find((a) => a.date >= today)
        const age = ageFrom(subject.dateOfBirth)

        return (
          <li key={subject.id}>
            <button
              type="button"
              onClick={() => onOpen(subject)}
              className="flex h-full w-full flex-col rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                  aria-hidden="true"
                >
                  <UserRound className="size-5" />
                </span>
                <SubjectStatusBadge status={subject.status} />
              </div>

              <p className="mt-3 truncate text-sm font-medium text-foreground">
                {subject.firstName} {subject.lastName}
              </p>
              <p className="id mt-0.5 text-xs font-medium text-cta">{subject.id}</p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                <Field label="Age" value={age === undefined ? '' : age} />
                <Field label="Gender" value={subject.gender} />
              </dl>

              <div className="mt-2.5 min-w-0">
                <p className="text-[0.6875rem] text-muted-foreground">Email</p>
                <p className="mt-0.5 truncate text-sm text-foreground">{subject.email}</p>
              </div>

              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cta">
                <Pill className="size-3.5" aria-hidden="true" />
                Current medications
              </p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border pt-3">
                <Field label="Last appointment" value={last ? formatDate(last.date) : ''} />
                <Field label="Next appointment" value={next ? formatDate(next.date) : ''} />
              </dl>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
