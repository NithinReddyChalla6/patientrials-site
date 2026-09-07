import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * A stale tab asking for chunks that no longer exist.
 *
 * Every route is code-split, so a browser holding the previous build's
 * `index.html` requests chunk filenames the new deploy no longer has. The import
 * rejects, and without this the whole tree unmounts to a white page.
 */
function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /failed to fetch dynamically imported module|loading chunk|importing a module script failed|error loading dynamically imported module/i.test(
    message,
  )
}

/** Guards the automatic reload so a genuinely broken build cannot loop. */
const RELOAD_KEY = 'patientrials.site.staleReloadAt'
const RELOAD_WINDOW_MS = 30_000

interface State {
  error: Error | null
}

/**
 * Catches render failures so the app shows something a person can act on.
 *
 * A stale build heals itself: the page reloads once, which fetches the current
 * `index.html` and its chunks. Anything else is reported, because silently
 * reloading a real bug would just hide it.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (!isStaleBuildError(error)) return

    // Reload at most once in the window, so a build that is actually broken
    // shows the message below instead of refreshing forever.
    let last = 0
    try {
      last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    } catch {
      last = 0
    }
    if (Date.now() - last < RELOAD_WINDOW_MS) return

    try {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      // Storage is unavailable; the reload below is still worth attempting.
    }
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const stale = isStaleBuildError(error)

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-md">
          <h1 className="text-lg font-semibold text-foreground">
            {stale ? 'This page needs a refresh' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {stale
              ? 'A newer version of the portal has been released since you opened this tab. Reloading picks it up.'
              : 'This screen failed to load. Reloading usually clears it. If it keeps happening, let the team know what you were doing.'}
          </p>
          <Button
            variant="brand"
            className="mt-5"
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
          >
            <RefreshCw aria-hidden="true" />
            Reload the page
          </Button>
        </div>
      </div>
    )
  }
}
