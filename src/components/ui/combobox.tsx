import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ComboboxOption {
  value: string
  label: string
  /** Secondary line — used for emails, addresses, sponsors. */
  description?: string
}

interface ComboboxProps {
  id?: string
  options: ComboboxOption[]
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  clearable?: boolean
  className?: string
  'aria-invalid'?: true | undefined
  'aria-describedby'?: string
}

/**
 * Searchable single-select.
 *
 * This is the replacement for the legacy "Lookup using list" control, which
 * opened a *new browser window* containing a record list and required the user
 * to find and click a row before being returned to the form. Everything happens
 * in place here: type to filter, arrow keys to move, Enter to choose.
 *
 * Implements the ARIA combobox pattern with `aria-activedescendant`, so focus
 * stays in the text field while the active option is announced.
 */
export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches found',
  disabled,
  clearable = true,
  className,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const listId = React.useId()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    )
  }, [options, query])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  // Keep the active option scrolled into view as the user arrows through.
  React.useEffect(() => {
    if (!open) return
    const node = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function choose(index: number) {
    const option = filtered[index]
    if (!option) return
    // Close before notifying the parent. `onChange` typically triggers a parent
    // state update, and if that lands first the popover's own close can be lost
    // in the same batch — leaving the list open over the field it just filled.
    setOpen(false)
    setQuery('')
    onChange(option.value)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(filtered.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(activeIndex)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-haspopup="listbox"
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy}
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-sm',
              'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
              'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive',
              clearable && selected && 'pr-16',
            )}
          >
            <span
              className={cn('min-w-0 flex-1 truncate', !selected && 'text-muted-foreground/70')}
            >
              {selected?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </Popover.Trigger>

        {clearable && selected && !disabled && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={`Clear selection: ${selected.label}`}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border border-border bg-popover shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down-out"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              role="searchbox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={
                filtered.length > 0 ? `${listId}-option-${activeIndex}` : undefined
              }
            />
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Options"
            className="max-h-64 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              filtered.map((option, index) => (
                <div
                  key={option.value}
                  id={`${listId}-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm',
                    index === activeIndex && 'bg-secondary',
                  )}
                >
                  <Check
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-brand',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-foreground">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>

          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground" aria-live="polite">
            {filtered.length} of {options.length} shown
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
