import { CalendarDays, MapPin, Users } from 'lucide-react'
import type { Study, StudyPromotion } from '@/data/types'
import { RecruitmentBadge } from '@/components/patterns/status-badge'

/**
 * Live preview of the public trial page.
 *
 * The legacy flow opened this in a popup window, which meant the writer lost the
 * form while checking their words and could be blocked by the browser entirely.
 * Rendering it inline, updating as they type, makes the copy easier to get right.
 */
export function TrialPreview({
  study,
  promotion,
}: {
  study: Study
  promotion: StudyPromotion
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-sunken p-4">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <RecruitmentBadge status={study.recruitmentStatus} />
        <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">{study.title}</h3>
        <p className="id mt-1 text-xs text-muted-foreground">{study.nctId}</p>

        {promotion.upcomingResearch.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {promotion.upcomingResearch.map((line, i) => (
              <p key={i} className="text-sm leading-6 text-foreground">
                {line}
              </p>
            ))}
          </div>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {promotion.minimumAge && (
            <div className="flex items-center gap-1.5">
              <Users className="size-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Minimum age</dt>
              <dd className="text-muted-foreground">Aged {promotion.minimumAge} and over</dd>
            </div>
          )}
          {promotion.locations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">Locations</dt>
              <dd className="text-muted-foreground">{promotion.locations.join(' · ')}</dd>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">Phase</dt>
            <dd className="text-muted-foreground">{study.phase}</dd>
          </div>
        </dl>

        {promotion.conditions.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground">You may be able to take part if</h4>
            <ul className="mt-2 space-y-1.5">
              {promotion.conditions.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {promotion.upcomingResearch.length === 0 &&
          promotion.conditions.length === 0 &&
          promotion.locations.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Add a description, eligibility points and locations above to see how the page will read.
            </p>
          )}
      </div>
    </div>
  )
}
