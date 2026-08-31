import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { formatCount } from '@/lib/format'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** Noun for the count summary, e.g. "participant". */
  itemLabel?: string
}

/**
 * Previous/next pagination with a spoken position summary.
 *
 * The legacy list paged with unlabelled chevron buttons and no indication of
 * where you were; the summary line here is also the `aria-live` announcement.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = 'result',
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{formatCount(first)}</span>–
        <span className="font-medium text-foreground">{formatCount(last)}</span> of{' '}
        <span className="font-medium text-foreground">{formatCount(total)}</span> {itemLabel}
        {total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        <span className="px-1 text-sm text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
