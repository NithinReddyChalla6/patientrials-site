import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { CheckboxField } from './checkbox'

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
  /** Optional right-aligned marker, e.g. a status badge. */
  meta?: React.ReactNode
}

interface MultiSelectProps {
  id?: string
  label: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  searchPlaceholder?: string
  emptyMessage?: string
  noResultsMessage?: string
  disabled?: boolean
  className?: string
}

/**
 * Searchable multi-select with a removable-chip summary.
 *
 * Replaces the legacy ServiceNow slushbucket, where assigning forms to a study
 * meant selecting an opaque 32-character sys_id from one list box and pressing
 * "Add selected options to the…" to move it to a second list box. Here the
 * available set and the chosen set are visible at once, options are searchable
 * by their real names, and each chosen item can be removed in one click.
 */
export function MultiSelect({
  id,
  label,
  options,
  value,
  onChange,
  searchPlaceholder = 'Search…',
  emptyMessage = 'Nothing available to assign yet.',
  noResultsMessage = 'No matches for your search.',
  disabled,
  className,
}: MultiSelectProps) {
  const [query, setQuery] = React.useState('')
  const listId = React.useId()

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    )
  }, [options, query])

  const selected = options.filter((o) => value.includes(o.value))

  function toggle(optionValue: string, checked: boolean) {
    onChange(checked ? [...value, optionValue] : value.filter((v) => v !== optionValue))
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            id={id}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            disabled={disabled || options.length === 0}
            aria-label={`Search ${label.toLowerCase()}`}
            aria-controls={listId}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
          />
        </div>

        <div id={listId} className="max-h-72 overflow-y-auto p-2">
          {options.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">{noResultsMessage}</p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-2 text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {filtered.map((option) => (
                <li key={option.value} className="flex items-center gap-3 px-1">
                  <CheckboxField
                    id={`${listId}-${option.value}`}
                    checked={value.includes(option.value)}
                    onCheckedChange={(checked) => toggle(option.value, checked)}
                    disabled={disabled}
                    label={option.label}
                    description={option.description}
                    className="min-w-0 flex-1"
                  />
                  {option.meta && <div className="shrink-0">{option.meta}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground" aria-live="polite">
          {selected.length === 0
            ? `No ${label.toLowerCase()} selected`
            : `${selected.length} selected`}
        </p>
        {selected.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {selected.map((option) => (
              <li key={option.value}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 py-1 pl-3 pr-1 text-xs font-medium text-brand">
                  {option.label}
                  <button
                    type="button"
                    onClick={() => toggle(option.value, false)}
                    disabled={disabled}
                    className="rounded-full p-1 transition-colors hover:bg-brand/15"
                    aria-label={`Remove ${option.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
