import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  /** Accessible name; also used to build the clear button's label. */
  label: string
}

/** Search box with an inline clear affordance, used by every list screen. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ className, value, onValueChange, label, ...props }, ref) {
    return (
      <div className={cn('relative', className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          aria-label={label}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            'h-9 w-full rounded-md border border-input bg-card pl-9 pr-9 text-sm text-foreground',
            'placeholder:text-muted-foreground/70',
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => onValueChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={`Clear ${label.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    )
  },
)
