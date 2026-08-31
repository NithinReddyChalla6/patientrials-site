import type * as React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { EmptyState } from './empty-state'
import type { LucideIcon } from 'lucide-react'

export interface RecordListItem {
  id: string
  title: string
  /** Lines of supporting detail, rendered small and muted. */
  lines: (string | undefined)[]
  meta?: React.ReactNode
}

interface RecordListProps {
  /** Accessible name, e.g. "Past trials added". */
  label: string
  items: RecordListItem[]
  emptyIcon?: LucideIcon
  emptyTitle: string
  emptyDescription?: string
  /** When set, each record becomes clickable to edit. */
  onSelect?: (id: string) => void
  selectLabel?: (item: RecordListItem) => string
  onRemove?: (id: string) => void
  removeLabel?: (item: RecordListItem) => string
  busyId?: string
  className?: string
}

/**
 * The "records captured so far" panel used by every repeatable wizard section.
 *
 * The legacy wizard showed this as a bare box that said "No records in Past
 * Trials" and, once populated, an unlabelled list with no way to correct a
 * mistake. Each entry here carries its own remove action, and the empty state
 * explains what the section is for instead of restating that it is empty.
 */
export function RecordList({
  label,
  items,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onSelect,
  selectLabel = (item) => `Edit ${item.title}`,
  onRemove,
  removeLabel = (item) => `Remove ${item.title}`,
  busyId,
  className,
}: RecordListProps) {
  if (items.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border bg-card', className)}>
        <EmptyState
          compact
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    )
  }

  return (
    <ul
      className={cn('divide-y divide-border rounded-lg border border-border bg-card', className)}
      aria-label={label}
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            'group relative flex items-start transition-colors',
            onSelect && 'hover:bg-secondary/40',
          )}
        >
          <div className="min-w-0 flex-1 p-4">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.lines.filter(Boolean).map((line, i) => (
              <p key={i} className="mt-0.5 truncate text-xs text-muted-foreground">
                {line}
              </p>
            ))}
            {item.meta && <div className="mt-2">{item.meta}</div>}
          </div>

          {onSelect && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-14 top-4 hidden items-center gap-1 text-xs font-medium text-brand group-hover:flex"
              >
                <Pencil className="size-3.5" />
                Edit
              </span>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-label={selectLabel(item)}
                className="absolute inset-0 rounded-lg"
              />
            </>
          )}

          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 m-2 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.id)}
              loading={busyId === item.id}
              aria-label={removeLabel(item)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
