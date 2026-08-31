import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const alertVariants = cva('flex gap-3 rounded-lg border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-info/25 bg-info/[0.07] text-foreground',
      success: 'border-success/25 bg-success/[0.07] text-foreground',
      warning: 'border-warning/25 bg-warning/[0.07] text-foreground',
      error: 'border-destructive/30 bg-destructive/[0.07] text-foreground',
    },
  },
  defaultVariants: { tone: 'info' },
})

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
} as const

const ICON_TONE = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
} as const

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode
  /** Errors announce themselves; informational alerts stay quiet. */
  live?: boolean
}

export function Alert({ className, tone = 'info', title, live, children, ...props }: AlertProps) {
  const Icon = ICONS[tone ?? 'info']
  return (
    <div
      className={cn(alertVariants({ tone }), className)}
      role={live || tone === 'error' ? 'alert' : undefined}
      {...props}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', ICON_TONE[tone ?? 'info'])} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold leading-6">{title}</p>}
        {children && <div className="leading-6 text-muted-foreground">{children}</div>}
      </div>
    </div>
  )
}
