import { useNavigate } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import type { StudyWithCounts, User } from '@/data/types'
import { formatCount } from '@/lib/format'
import { RecruitmentBadge, StudyStatusBadge } from '@/components/patterns/status-badge'

/**
 * Study summary card.
 *
 * Carries what the legacy card carried — identifiers, investigator, brief
 * summary, and the prospects / subjects / consent-document counts along the
 * foot — because those numbers are what a coordinator scans the list for.
 *
 * What is not reproduced: the legacy "Collaborators" field, which read "Not
 * Available" on every card in the list, and the green corner ribbon, which
 * encoded promoted status in a shape with no text and no accessible name. The
 * status is a labelled badge instead.
 *
 * The card is a button rather than a link because the automated suite opens a
 * study with `getByRole('button', { name: 'STU01268' })` — which is why the
 * identifier leads the card's content and so its accessible name.
 */
export function StudyCard({
  study,
  investigator,
}: {
  study: StudyWithCounts
  investigator?: User
}) {
  const navigate = useNavigate()
  const pct =
    study.enrollmentTarget > 0
      ? Math.min(100, Math.round((study.enrolled / study.enrollmentTarget) * 100))
      : 0

  return (
    <button
      type="button"
      onClick={() => navigate(`/studies/${study.id}`)}
      className="group flex h-full w-full flex-col rounded-lg border border-border bg-card text-left shadow-sm transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="id text-xs font-medium text-muted-foreground">
            {study.id} · {study.nctId}
          </p>
          <StudyStatusBadge status={study.status} />
        </div>

        <h3 className="mt-2 line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-foreground group-hover:text-brand">
          {study.title}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {study.briefSummary}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <RecruitmentBadge status={study.recruitmentStatus} />
          <span>{study.phase}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{study.condition}</span>
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
          {investigator ? (
            <>
              <span className="sr-only">Principal investigator: </span>
              {investigator.firstName} {investigator.lastName}
            </>
          ) : (
            <span className="text-warning">No principal investigator</span>
          )}
        </p>

        {study.enrollmentTarget > 0 && (
          <div className="mt-auto pt-4">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Enrolment</span>
              <span className="tabular-nums text-foreground">
                {formatCount(study.enrolled)} / {formatCount(study.enrollmentTarget)}
              </span>
            </div>
            <div
              className="mt-1 h-1 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={study.enrollmentTarget}
              aria-valuenow={study.enrolled}
              aria-label={`Enrolment for ${study.title}`}
            >
              <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* The legacy card's footer strip: the three counts staff scan for. */}
      <dl className="grid grid-cols-3 divide-x divide-border border-t border-border bg-sunken text-center">
        <Count label="Prospects" value={study.prospects} highlight={study.prospects > 0} />
        <Count label="Subjects" value={study.subjects} />
        <Count label="Consents" value={study.consentDocuments} />
      </dl>
    </button>
  )
}

function Count({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="px-2 py-2">
      <dt className="text-[0.6875rem] uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          highlight
            ? 'text-sm font-semibold tabular-nums text-warning'
            : 'text-sm font-semibold tabular-nums text-foreground'
        }
      >
        {formatCount(value)}
      </dd>
    </div>
  )
}
