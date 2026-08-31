import type * as React from 'react'
import { RefreshCw } from 'lucide-react'
import type { AsyncState } from '@/lib/use-async'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SkeletonRows } from '@/components/ui/skeleton'

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>
  /** Shape-matched placeholder. Defaults to generic rows. */
  loading?: React.ReactNode
  /** Decides whether a successful read counts as "nothing here". */
  isEmpty?: (data: T) => boolean
  empty?: React.ReactNode
  /** Overrides the default retry alert. */
  errorTitle?: string
  children: (data: T) => React.ReactNode
}

/**
 * Renders exactly one of loading / error / empty / content for an async read.
 *
 * Every list and detail screen goes through this, which is how the app
 * guarantees the four states exist everywhere instead of only on the screens
 * someone remembered to finish. Refreshes keep the previous content on screen
 * rather than flashing back to a skeleton.
 */
export function AsyncBoundary<T>({
  state,
  loading,
  isEmpty,
  empty,
  errorTitle = 'We could not load this',
  children,
}: AsyncBoundaryProps<T>) {
  if (state.isInitialLoading) {
    return <>{loading ?? <SkeletonRows />}</>
  }

  if (state.status === 'error') {
    return (
      <Alert tone="error" title={errorTitle}>
        <p>{state.error?.message ?? 'Something went wrong.'}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={state.reload}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </Alert>
    )
  }

  if (state.data === undefined) {
    return <>{loading ?? <SkeletonRows />}</>
  }

  if (isEmpty?.(state.data) && empty) {
    return <>{empty}</>
  }

  return <>{children(state.data)}</>
}
