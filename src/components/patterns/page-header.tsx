import * as React from 'react'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  /** Small context line above the title, e.g. the study id. */
  eyebrow?: React.ReactNode
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  /** Ref target so route changes can move focus to the heading. */
  headingRef?: React.Ref<HTMLHeadingElement>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  headingRef,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold leading-tight text-foreground outline-none sm:text-[1.75rem]"
        >
          {title}
        </h1>
        {description && (
          <div className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
