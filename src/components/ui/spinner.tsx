import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Inline busy indicator. List screens use skeletons; this is for small spots. */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Loader2 className={cn('size-4 animate-spin text-muted-foreground', className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
