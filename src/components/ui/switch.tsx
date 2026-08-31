import { cn } from '@/lib/cn'

/**
 * Toggle built on a native button with `role="switch"` — one small control
 * instead of another dependency, and keyboard/AT behaviour comes for free.
 */
export function Switch({
  id,
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** Accessible name when no visible <label> is associated. */
  label?: string
  className?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-success' : 'bg-input',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-5 transform rounded-full bg-card shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
