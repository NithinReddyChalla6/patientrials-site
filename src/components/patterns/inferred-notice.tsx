import { Lightbulb } from 'lucide-react'
import type * as React from 'react'

/**
 * Marks a screen that was designed rather than reconstructed from evidence.
 *
 * The legacy portal listed Dashboard, Site Hierarchy and Question Groups in its
 * navigation, but the screenshots and automated tests this build was based on
 * never show them. Rather than quietly invent those screens and present them as
 * a faithful redesign, they carry this notice.
 */
export function InferredNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-info/25 bg-info/[0.06] px-4 py-3 text-sm">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Proposed screen. </span>
        {children}
      </p>
    </div>
  )
}
