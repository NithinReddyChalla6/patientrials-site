import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'

interface ListInputProps {
  id: string
  /** Accessible name for the list of entries already added. */
  label: string
  placeholder?: string
  items: string[]
  onChange: (items: string[]) => void
  addLabel?: string
  /** Stable hook for the automated suite's add buttons. */
  addButtonId?: string
  emptyMessage?: string
  maxItems?: number
  disabled?: boolean
  /** Render entries as compact inline chips (for short tags like conditions or
   *  keywords) instead of the default stacked rows (for longer free-text lines). */
  chips?: boolean
  'aria-describedby'?: string
  'aria-invalid'?: true | undefined
}

/**
 * Build a short list of free-text entries.
 *
 * Used for promotion eligibility lines and for choice options. Enter adds an
 * entry without submitting the surrounding form, each entry can be removed, and
 * additions are announced so the list is usable without sight of it.
 */
export function ListInput({
  id,
  label,
  placeholder,
  items,
  onChange,
  addLabel = 'Add',
  addButtonId,
  emptyMessage = 'Nothing added yet.',
  maxItems,
  disabled,
  chips,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
}: ListInputProps) {
  const [draft, setDraft] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const atLimit = maxItems !== undefined && items.length >= maxItems

  function add() {
    const value = draft.trim()
    if (!value || atLimit) return
    if (items.includes(value)) {
      setDraft('')
      return
    }
    onChange([...items, value])
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          disabled={disabled || atLimit}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
        />
        <Button
          id={addButtonId}
          type="button"
          variant="outline"
          onClick={add}
          disabled={disabled || atLimit || draft.trim().length === 0}
        >
          <Plus aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{addLabel}</span>
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        {items.length === 0 ? emptyMessage : `${items.length} added`}
      </p>

      {items.length > 0 ? (
        chips ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={label}>
            {items.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-sunken py-1 pl-3 pr-1.5 text-sm text-foreground"
              >
                <span className="min-w-0 truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  disabled={disabled}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  aria-label={`Remove "${item}"`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 space-y-2" aria-label={label}>
            {items.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2"
              >
                <span className="min-w-0 flex-1 text-sm text-foreground">{item}</span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  disabled={disabled}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  aria-label={`Remove "${item}"`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{emptyMessage}</p>
      )}

      {atLimit && (
        <p className="mt-2 text-xs text-muted-foreground">
          You have added the maximum of {maxItems}.
        </p>
      )}
    </div>
  )
}
