import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** The one thing the user should do next. */
  action?: React.ReactNode
  /** Secondary escape hatch, e.g. "Clear filters". */
  secondaryAction?: React.ReactNode
  className?: string
  compact?: boolean
  /**
   * Heading level for the title. Defaults to a paragraph because an empty state
   * usually sits inside a section that already has a heading; a screen whose
   * whole content is an empty state should pass a real heading instead.
   */
  titleAs?: 'p' | 'h1' | 'h2'
}

/**
 * The empty state contract: say what is missing, then offer the action that
 * fills it. Distinct from `NoResults`, which means "your filter matched
 * nothing" — conflating the two is what makes empty screens feel broken.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact,
  titleAs: Title = 'p',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
      )}
      <Title
        className={cn(
          'font-semibold text-foreground',
          Title === 'h1' ? 'text-2xl' : 'text-base',
        )}
      >
        {title}
      </Title>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
