import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { siteApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { SiteDetailsStep } from '@/features/onboarding/steps/site-details-step'
import { PastTrialsStep } from '@/features/onboarding/steps/past-trials-step'
import { IrbStep } from '@/features/onboarding/steps/irb-step'
import { LabsStep } from '@/features/onboarding/steps/labs-step'
import { FacilitiesStep } from '@/features/onboarding/steps/facilities-step'
import { InvestigatorsSection, NursesSection } from './site-people'
import { useAuth } from '@/features/auth/auth-context'

/** Segment values match the sidebar's deep links and the legacy entry names. */
const TABS = [
  { value: 'details', label: 'Site details', Component: SiteDetailsStep },
  { value: 'past-trials', label: 'Past Trials', Component: PastTrialsStep },
  { value: 'irb', label: 'IRB details', Component: IrbStep },
  { value: 'labs', label: 'Labs Associated', Component: LabsStep },
  { value: 'facilities', label: 'Facility Services', Component: FacilitiesStep },
  { value: 'investigators', label: 'Investigators', Component: InvestigatorsSection },
  { value: 'nurses', label: 'Nurses', Component: NursesSection },
] as const

/**
 * The site record, outside the wizard.
 *
 * The legacy sidebar listed Past Trials, IRB Details, Labs Associated, Facility
 * Services and Edit Site as five separate destinations, which made a single
 * record feel like five unrelated screens and gave no sense of how complete the
 * site profile was. They are tabs of one screen here, using the same section
 * components as onboarding so the two can never diverge.
 */
export function SiteProfilePage() {
  const state = useAsync(() => siteApi.onboardingSnapshot(), [])
  const { siteTab } = useParams()
  const navigate = useNavigate()
  // The tab lives in the URL so the sidebar can link straight to "IRB details"
  // and a reload keeps you where you were.
  const tab = TABS.some((t) => t.value === siteTab) ? (siteTab as string) : 'details'
  const { can } = useAuth()
  const canEdit = can('site.edit')

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Edit Site"
        description="Your site's identity, history, review board, labs and facilities. Sponsors see this when they consider your site for a study."
        actions={
          <Button variant="outline" asChild>
            <Link to="/onboarding">
              <ListChecks aria-hidden="true" />
              Open guided setup
            </Link>
          </Button>
        }
      />

      {!canEdit && (
        <Alert tone="info" title="You have read-only access to the site profile">
          Ask a Site Administrator to make changes here.
        </Alert>
      )}

      <AsyncBoundary
        state={state}
        loading={
          <div className="space-y-4">
            <Skeleton className="h-11 w-full max-w-md" />
            <Skeleton className="h-96" />
          </div>
        }
        errorTitle="We could not load your site"
      >
        {(data) => (
          <Tabs
            value={tab}
            onValueChange={(next) => navigate(next === 'details' ? '/site' : `/site/${next}`)}
          >
            <TabsList className="flex w-full flex-wrap justify-start">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-6">
                <fieldset disabled={!canEdit} className="min-w-0">
                  <t.Component data={data} reload={state.reload} />
                </fieldset>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </AsyncBoundary>
    </div>
  )
}
