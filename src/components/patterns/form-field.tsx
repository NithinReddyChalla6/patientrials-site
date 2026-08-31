import type * as React from 'react'
import { cn } from '@/lib/cn'
import { Label } from '@/components/ui/label'

export interface FieldAria {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

interface FormFieldProps {
  /** Must match the control's id so the label and aria wiring are correct. */
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  /** Render the control, spreading the provided aria props onto it. */
  children: (aria: FieldAria) => React.ReactNode
}

/**
 * The accessibility contract for every form control in the app, in one place.
 *
 * Renders the label, the control, an optional hint and an error that is
 * announced via `role="alert"` and wired through `aria-describedby` /
 * `aria-invalid`. Because forms are built from this rather than from bare
 * inputs, no screen can quietly ship an unlabelled field or a silent error.
 *
 * This replaces the legacy pattern of a "Required information" strip of red
 * chips at the bottom of the page, which named failing fields but never
 * connected them to the inputs that failed.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('min-w-0', className)}>
      <Label htmlFor={id} className="mb-1.5 inline-block">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </Label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Grouped controls (radio group, checkbox set) need a fieldset, not a label. */
export function FieldSet({
  legend,
  hint,
  error,
  required,
  className,
  children,
}: {
  legend: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-1.5 text-sm font-medium text-foreground">
        {legend}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </legend>
      {hint && !error && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
