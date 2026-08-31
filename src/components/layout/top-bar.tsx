import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { initialsOf } from '@/lib/format'
import { ROLE_LABELS, type Role } from '@/data/types'
import { useAuth } from '@/features/auth/auth-context'
import { getSimulation, setSimulation, type SimulationMode } from '@/data/api'

const SIM_MODES: { value: SimulationMode; label: string; hint: string }[] = [
  { value: 'normal', label: 'Normal', hint: 'Typical response times' },
  { value: 'slow', label: 'Slow network', hint: 'See every loading state' },
  { value: 'error', label: 'Server error', hint: 'See every error state' },
  { value: 'empty', label: 'No data', hint: 'See every empty state' },
]

/**
 * Console top bar: site context, global search, the state simulator, and the
 * account menu — which is where signing out and switching product belong,
 * rather than taking a slot in the navigation.
 */
export function TopBar({
  onOpenNav,
  navTriggerRef,
  siteName,
  onOpenSearch,
}: {
  onOpenNav: () => void
  navTriggerRef?: React.Ref<HTMLButtonElement>
  siteName?: string
  onOpenSearch: () => void
}) {
  const { user, role, signOut, switchRole } = useAuth()
  const [sim, setSim] = React.useState(getSimulation().mode)
  const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
      <Button
        ref={navTriggerRef}
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu aria-hidden="true" />
      </Button>

      {siteName && (
        <p className="hidden min-w-0 truncate text-sm font-medium text-foreground sm:block">
          {siteName}
        </p>
      )}

      {/* Global search — the primary way around a console this size */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary sm:ml-4 sm:mr-auto sm:w-72"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden flex-1 text-left sm:block">Search…</span>
        <kbd className="hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[0.6875rem] sm:block">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
        <Link to="/find-trials" target="_blank" rel="noreferrer">
          Participant site
          <ExternalLink aria-hidden="true" />
        </Link>
      </Button>

      {/* State simulator */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            variant={sim === 'normal' ? 'ghost' : 'outline'}
            size="sm"
            className={cn(sim !== 'normal' && 'border-warning/40 text-warning')}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span className="hidden lg:inline">
              {sim === 'normal' ? 'States' : SIM_MODES.find((m) => m.value === sim)?.label}
            </span>
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-50 w-72 rounded-lg border border-border bg-popover p-1 shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down-out"
          >
            <p className="px-2 pb-1 pt-2 text-xs text-muted-foreground">
              Force a system state to review how every screen responds.
            </p>
            <ul>
              {SIM_MODES.map((mode) => (
                <li key={mode.value}>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulation(mode.value)
                      setSim(mode.value)
                    }}
                    aria-pressed={sim === mode.value}
                    className={cn(
                      'flex min-h-10 w-full flex-col justify-center rounded-md px-2.5 py-1 text-left text-sm transition-colors',
                      sim === mode.value
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-secondary',
                    )}
                  >
                    <span className="font-medium">{mode.label}</span>
                    <span className="text-xs text-muted-foreground">{mode.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-2 pb-1 pt-2 text-xs text-muted-foreground">
              Reload the page after switching to re-run reads.
            </p>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Account */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-secondary"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[0.6875rem] font-semibold text-brand"
              aria-hidden="true"
            >
              {user ? initialsOf(`${user.firstName} ${user.lastName}`) : '—'}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Account menu</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-50 w-72 rounded-lg border border-border bg-popover p-1 shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down-out"
          >
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>

            <div className="border-t border-border py-1">
              <p className="px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                View as role
              </p>
              <ul>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => switchRole(r)}
                      aria-pressed={role === r}
                      className={cn(
                        'flex min-h-8 w-full items-center rounded-md px-2.5 text-sm transition-colors',
                        role === r
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'hover:bg-secondary',
                      )}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border pt-1">
              <Button variant="ghost" asChild className="h-9 w-full justify-start px-2.5 font-normal">
                <Link to="/hub">
                  <LayoutGrid className="size-4" aria-hidden="true" />
                  Switch workspace
                </Link>
              </Button>
              <button
                type="button"
                onClick={signOut}
                className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </header>
  )
}
