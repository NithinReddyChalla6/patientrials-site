import { cn } from '@/lib/cn'

/** Intrinsic size of the wordmark asset (public/patientrials.png). */
const LOGO_RATIO = 230 / 62

/**
 * The PatienTrials wordmark — the real brand logo (azure "patien+rials" with the
 * orange cross and smile, and the syringe mark). Served from `public/` so it
 * stays crisp and is cached; every header and the sidebar sit on light surfaces,
 * so the colour reads without a dark variant.
 */
export function Brand({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md'
}) {
  const height = size === 'sm' ? 22 : 28
  const width = Math.round(height * LOGO_RATIO)

  return (
    <img
      src="/patientrials.png"
      alt="PatienTrials"
      width={width}
      height={height}
      draggable={false}
      className={cn('block w-auto select-none', size === 'sm' ? 'h-[22px]' : 'h-7', className)}
    />
  )
}
