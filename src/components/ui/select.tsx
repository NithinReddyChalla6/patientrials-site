import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Convenience for simple string option lists. */
  options?: readonly string[]
  placeholder?: string
}

/**
 * A native select, styled.
 *
 * Deliberately native rather than a custom listbox: for short option sets it is
 * the most accessible control available and gives mobile users their platform
 * picker for free. Long, searchable option sets use `Combobox` instead.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, placeholder, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-input bg-card py-2 pl-3 pr-9 text-sm text-foreground',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
          'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
})
