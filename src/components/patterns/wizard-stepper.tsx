import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface WizardStep {
  id: string
  label: string
  /** Short summary of what has been captured, shown under the label. */
  summary?: string
}

interface WizardStepperProps {
  steps: WizardStep[]
  currentIndex: number
  /** Indexes the user has completed; drives the tick and unlocks navigation. */
  completed: Set<number>
  onStepSelect?: (index: number) => void
  className?: string
}

/**
 * Progress across a multi-section flow.
 *
 * The legacy site-onboarding wizard was a row of plain text tabs with no
 * indication of which sections were done, how many were left, or whether you
 * could go back — you found out by clicking. This shows position, completion
 * and reachability at a glance, and collapses to a labelled progress bar on
 * mobile rather than wrapping six tabs onto three lines.
 */
export function WizardStepper({
  steps,
  currentIndex,
  completed,
  onStepSelect,
  className,
}: WizardStepperProps) {
  const current = steps[currentIndex]

  return (
    <div className={className}>
      {/* Mobile: position + progress */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{current?.label}</p>
          <p className="text-xs text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </p>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={currentIndex + 1}
          aria-label={`Step ${currentIndex + 1} of ${steps.length}: ${current?.label}`}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: full step list */}
      <ol className="hidden gap-1 md:flex" aria-label="Progress">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex
          const isDone = completed.has(index)
          const reachable = isDone || index <= currentIndex
          const Tag = onStepSelect && reachable ? 'button' : 'div'

          return (
            <li key={step.id} className="min-w-0 flex-1">
              <Tag
                {...(Tag === 'button'
                  ? { type: 'button' as const, onClick: () => onStepSelect?.(index) }
                  : {})}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full min-w-0 items-start gap-2.5 rounded-md border-t-2 px-3 py-3 text-left transition-colors',
                  isCurrent
                    ? 'border-t-brand bg-accent/40'
                    : isDone
                      ? 'border-t-success/60 hover:bg-secondary/50'
                      : 'border-t-border',
                  Tag === 'button' && 'cursor-pointer',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    isDone
                      ? 'bg-success text-success-foreground'
                      : isCurrent
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {isDone ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-sm font-medium',
                      isCurrent ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                  {step.summary && (
                    <span className="block truncate text-xs text-muted-foreground">
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
