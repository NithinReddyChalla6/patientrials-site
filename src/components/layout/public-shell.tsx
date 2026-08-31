import * as React from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Brand } from './brand'

const LINKS = [
  { to: '/find-trials', label: 'Find trials', alwaysVisible: true },
  // Reachable from the footer and the consent copy on small screens, where the
  // header does not have room for both links plus the sign-in action.
  { to: '/about', label: 'About studies', alwaysVisible: false },
]

/**
 * Layout for the participant-facing pages.
 *
 * Deliberately a different chrome from the console — a participant is not a
 * member of staff and should never see the site navigation — while using the
 * same tokens and components, so the two halves read as one product.
 */
export function PublicShell() {
  const location = useLocation()
  const mainRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    mainRef.current?.focus()
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
          <Link to="/find-trials" className="rounded-md">
            <Brand />
            <span className="sr-only">PatienTrials home</span>
          </Link>
          <nav aria-label="Participant" className="min-w-0 flex-1">
            <ul className="flex items-center gap-0.5 sm:gap-1">
              {LINKS.map((link) => (
                <li key={link.to} className={link.alwaysVisible ? undefined : 'hidden sm:block'}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2 text-sm font-medium transition-colors sm:px-3',
                        isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/login">
              <span className="sm:hidden">Sign in</span>
              <span className="hidden sm:inline">Staff sign in</span>
            </Link>
          </Button>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Taking part in research is voluntary. You can stop at any time without affecting your
            usual care.
          </p>
          <p className="flex items-center gap-4">
            <Link to="/about" className="underline-offset-4 hover:underline sm:hidden">
              About studies
            </Link>
            <span>PatienTrials</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
