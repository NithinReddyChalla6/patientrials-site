import { Building2, MapPin, Network, Users } from 'lucide-react'
import { siteApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { formatAddress, pluralize } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { ActiveDot } from '@/components/patterns/status-badge'
import { InferredNotice } from '@/components/patterns/inferred-notice'

/**
 * Site hierarchy.
 *
 * The legacy sidebar carried a "Site Hierarchy" entry with a red badge, but no
 * screenshot or automated test in the source material shows what it opened. This
 * is a designed answer to the question the name implies — how this site sits
 * within its network, and which facilities and people belong to it — built only
 * from records the app already holds, so nothing here is invented data.
 */
export function SiteHierarchyPage() {
  const state = useAsync(() => siteApi.onboardingSnapshot(), [])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Site Hierarchy"
        description="How your site is structured: the network it belongs to, its facilities, and the people attached to each."
      />

      <InferredNotice>
        The legacy portal listed Site Hierarchy in its navigation but the source material does not
        show the screen. This view is assembled from your existing site, facility and team records.
      </InferredNotice>

      <AsyncBoundary
        state={state}
        loading={<Skeleton className="h-96" />}
        errorTitle="We could not load your site structure"
      >
        {(data) => {
          const activeFacilities = data.facilities.filter((f) => f.active).length

          return (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
              {/* Network */}
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Network className="size-5 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {data.site.address.country}
                  </p>
                  <p className="text-xs text-muted-foreground">Network region</p>
                </div>
              </div>

              {/* Site */}
              <div className="ml-5 border-l border-border pl-6 pt-5">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Building2 className="size-5 text-brand" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                      {data.site.name}
                      <Badge tone="brand">Your site</Badge>
                    </p>
                    <p className="id text-xs text-muted-foreground">{data.site.number}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatAddress(data.site.address)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {pluralize(activeFacilities, 'active facility', 'active facilities')} ·{' '}
                      {pluralize(data.collaborators.filter((c) => c.active).length, 'active member')}{' '}
                      · {pluralize(data.labs.length, 'lab')}
                    </p>
                  </div>
                  <ActiveDot active={data.site.active} />
                </div>

                {/* Facilities */}
                <ul className="ml-5 mt-5 space-y-4 border-l border-border pl-6">
                  {data.facilities.map((facility) => (
                    <li key={facility.id} className="flex flex-wrap items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{facility.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {facility.type} · {formatAddress(facility.address)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {facility.serviceEquipment}
                        </p>
                      </div>
                      <ActiveDot active={facility.active} />
                    </li>
                  ))}

                  {data.facilities.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      No facilities recorded. Add them from your site profile.
                    </li>
                  )}
                </ul>

                {/* People */}
                <div className="ml-5 mt-6 border-l border-border pl-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Team</p>
                      <p className="text-xs text-muted-foreground">
                        {pluralize(data.collaborators.length, 'person', 'people')} attached to this
                        site
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }}
      </AsyncBoundary>
    </div>
  )
}
