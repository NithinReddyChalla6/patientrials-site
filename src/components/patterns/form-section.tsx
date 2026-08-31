import type * as React from 'react'
import { cn } from '@/lib/cn'

interface FormSectionProps {
  title: string
  description?: React.ReactNode
  /** Fields laid out in a responsive two-column grid by default. */
  columns?: 1 | 2
  className?: string
  children: React.ReactNode
}

/**
 * A titled group of fields. Long forms (site details, IRB, enrolment) are built
 * from these so related questions stay visually grouped and each group gets a
 * real heading for screen-reader navigation.
 */
export function FormSection({
  title,
  description,
  columns = 2,
  className,
  children,
}: FormSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div
        className={cn(
          'grid gap-4',
          columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {children}
      </div>
    </section>
  )
}

/** Spans both columns inside a two-column FormSection. */
export function FullWidth({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('sm:col-span-2', className)}>{children}</div>
}
