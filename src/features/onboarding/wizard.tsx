import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { siteApi } from '@/data/api'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/use-async'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { PageHeader } from '@/components/patterns/page-header'
import { Brand } from '@/components/layout/brand'
import type { OnboardingSnapshot, StepProps } from './types'
import { SiteDetailsStep } from './steps/site-details-step'
import { PastTrialsStep } from './steps/past-trials-step'
import { IrbStep } from './steps/irb-step'
import { LabsStep } from './steps/labs-step'
import { FacilitiesStep } from './steps/facilities-step'
import { CollaboratorsStep } from './steps/collaborators-step'

interface StepDefinition {
  id: string
  label: string
  Component: (props: StepProps) => React.JSX.Element
  isComplete: (data: OnboardingSnapshot) => boolean
  summary: (data: OnboardingSnapshot) => string | undefined
}

/**
 * Site onboarding.
 *
 * The six sections are the legacy wizard's six tabs — Site Details, Past
 * Trials, IRB Details, Labs Associated, Facility Services, Collaborators — in
 * the same order, because that order reflects how a site is actually assembled.
 * What changed is that the flow now tells you where you are, what is done, and
 * that you may leave and come back: the legacy version gave no completion state
 * and no indication that anything had been saved.
 */
const STEPS: StepDefinition[] = [
  {
    id: 'site-details',
    label: 'Site details',
    Component: SiteDetailsStep,
    isComplete: (d) => Boolean(d.site.name && d.site.address.city && d.site.address.country),
    summary: (d) => (d.site.address.city ? `${d.site.address.city}, ${d.site.address.state}` : undefined),
  },
  {
    id: 'past-trials',
    label: 'Past trials',
    Component: PastTrialsStep,
    isComplete: (d) => d.pastTrials.length > 0,
    summary: (d) => (d.pastTrials.length ? `${d.pastTrials.length} recorded` : undefined),
  },
  {
    id: 'irb',
    label: 'IRB details',
    Component: IrbStep,
    isComplete: (d) => d.irbDetails.length > 0,
    summary: (d) => d.irbDetails[0]?.name,
  },
  {
    id: 'labs',
    label: 'Labs',
    Component: LabsStep,
    isComplete: (d) => d.labs.length > 0,
    summary: (d) => (d.labs.length ? `${d.labs.length} associated` : undefined),
  },
  {
    id: 'facilities',
    label: 'Facilities',
    Component: FacilitiesStep,
    isComplete: (d) => d.facilities.length > 0,
    summary: (d) => (d.facilities.length ? `${d.facilities.length} listed` : undefined),
  },
  {
    id: 'collaborators',
    label: 'Team',
    Component: CollaboratorsStep,
    isComplete: (d) => d.collaborators.length > 0,
    summary: (d) => (d.collaborators.length ? `${d.collaborators.length} people` : undefined),
  },
]

export function OnboardingWizard() {
  const [index, setIndex] = React.useState(0)
  const state = useAsync(() => siteApi.onboardingSnapshot(), [])
  const navigate = useNavigate()
  const toast = useToast()
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  const step = STEPS[index]

  function goTo(next: number) {
    setIndex(next)
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  return (
    <div className="min-h-dvh bg-background">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Step {index + 1} of {STEPS.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              Save and exit
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <AsyncBoundary
          state={state}
          loading={
            <div className="space-y-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-96" />
            </div>
          }
          errorTitle="We could not load your site setup"
        >
          {(data) => {
            const completed = new Set(
              STEPS.map((s, i) => (s.isComplete(data) ? i : -1)).filter((i) => i >= 0),
            )
            const allDone = completed.size === STEPS.length
            const isLast = index === STEPS.length - 1

            return (
              <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-12">
                <aside className="lg:sticky lg:top-8 lg:self-start">
                  <StepperRail
                    steps={STEPS.map((s) => ({
                      id: s.id,
                      label: s.label,
                      summary: s.summary(data),
                    }))}
                    currentIndex={index}
                    completed={completed}
                    onSelect={goTo}
                  />
                </aside>

                <div className="mt-8 min-w-0 lg:mt-0">
                  <PageHeader
                    headingRef={headingRef}
                    eyebrow="Site setup"
                    title={step.label}
                    description="Everything you enter is saved as you go. You can leave this setup and pick it up later."
                  />

                  <div className="mt-8">
                    <step.Component data={data} reload={state.reload} />
                  </div>

                  <nav
                    className="mt-10 flex flex-col-reverse items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
                    aria-label="Setup steps"
                  >
                    <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
                      <ArrowLeft aria-hidden="true" />
                      Back
                    </Button>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                      {!step.isComplete(data) && (
                        <p className="text-sm text-muted-foreground sm:mr-2">
                          You can continue and come back to this section.
                        </p>
                      )}
                      {isLast ? (
                        <Button
                          variant="brand"
                          size="lg"
                          onClick={() => {
                            toast.success(
                              allDone ? 'Site setup complete' : 'Setup saved',
                              allDone
                                ? 'Your site is ready to take on studies.'
                                : 'You can finish the remaining sections from your site profile.',
                            )
                            navigate('/dashboard')
                          }}
                        >
                          <Check aria-hidden="true" />
                          Finish
                        </Button>
                      ) : (
                        <Button variant="brand" size="lg" onClick={() => goTo(index + 1)}>
                          Next
                          <ArrowRight aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </nav>
                </div>
              </div>
            )
          }}
        </AsyncBoundary>
      </main>
    </div>
  )
}

/**
 * The onboarding progress rail. A shared progress meter, then — on desktop — a
 * vertical list of the six sections with completion ticks and a connecting
 * spine; on mobile it collapses to the meter plus the current step.
 */
function StepperRail({
  steps,
  currentIndex,
  completed,
  onSelect,
}: {
  steps: { id: string; label: string; summary?: string }[]
  currentIndex: number
  completed: Set<number>
  onSelect: (index: number) => void
}) {
  const total = steps.length
  const doneCount = completed.size
  const current = steps[currentIndex]

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Setup progress
        </p>
        <p className="text-xs font-medium tabular-nums text-muted-foreground">
          {doneCount} of {total}
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={doneCount}
        aria-label={`${doneCount} of ${total} sections complete`}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>

      <p className="mt-3 text-sm font-medium text-foreground lg:hidden">
        Step {currentIndex + 1} of {total}: {current?.label}
      </p>

      <ol className="relative mt-6 hidden lg:block" aria-label="Setup sections">
        <span aria-hidden="true" className="absolute bottom-5 left-[22px] top-5 w-px bg-border" />
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex
          const isDone = completed.has(i)
          const reachable = isDone || i <= currentIndex
          const Tag = reachable ? 'button' : 'div'
          return (
            <li key={step.id} className="relative">
              {isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                />
              )}
              <Tag
                {...(reachable ? { type: 'button' as const, onClick: () => onSelect(i) } : {})}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                  reachable && 'cursor-pointer hover:bg-secondary/60',
                  isCurrent && 'bg-brand/10',
                )}
              >
                <span
                  className={cn(
                    'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isDone
                      ? 'border-brand bg-brand text-brand-foreground'
                      : isCurrent
                        ? 'border-brand bg-card text-brand ring-2 ring-brand/25'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {isDone ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      'block text-sm',
                      isCurrent
                        ? 'font-semibold text-brand'
                        : isDone
                          ? 'font-medium text-foreground'
                          : 'font-medium text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                  {step.summary && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {step.summary}
                    </span>
                  )}
                  {isDone && <span className="sr-only"> (completed)</span>}
                </span>
              </Tag>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
