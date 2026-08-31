import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatCount } from '@/lib/format'

interface StatTileProps {
  /** Kept stable for the automated suite, which targets `#active` and friends. */
  id?: string
  label: string
  value: number | string
  hint?: string
  icon?: LucideIcon
  /** Turns the tile into a filter toggle (the Studies status tiles). */
  selected?: boolean
  onSelect?: () => void
  className?: string
}

/**
 * Count tile. Doubles as the status filter on list screens, where the legacy
 * used four flat panels that gave no indication they were clickable.
 */
export function StatTile({
  id,
  label,
  value,
  hint,
  icon: Icon,
  selected,
  onSelect,
  className,
}: StatTileProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.06em]',
            selected ? 'text-brand' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            className={cn('size-4 shrink-0', selected ? 'text-brand' : 'text-muted-foreground')}
            aria-hidden="true"
          />
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {typeof value === 'number' ? formatCount(value) : value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </>
  )

  if (!onSelect) {
    return (
      <div
        id={id}
        className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      id={id}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'rounded-lg border bg-card p-4 text-left shadow-sm transition-colors',
        selected ? 'border-brand bg-accent/40' : 'border-border hover:border-brand/40',
        className,
      )}
    >
      {content}
    </button>
  )
}
