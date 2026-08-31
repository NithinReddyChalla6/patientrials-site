import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as Popover from '@radix-ui/react-popover'
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
  LayoutGrid,
  LogOut,
  Share2,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { dashboardApi, siteApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { cn } from '@/lib/cn'
import { formatCount, initialsOf } from '@/lib/format'
import { ROLE_LABELS } from '@/data/types'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from './auth-context'

interface Workspace {
  id: string
  title: string
  description: string
  icon: LucideIcon
  to: string | null
  available: boolean
  /** Shown on the unavailable cards in place of live figures. */
  note?: string
}

const WORKSPACES: Workspace[] = [
  {
    id: 'site-solution',
    title: 'SITE SOLUTION',
    description:
      'Run your studies end to end — onboarding, participant screening, forms and appointments.',
    icon: LayoutGrid,
    to: '/studies',
    available: true,
  },
  {
    id: 'patient-referrals',
    title: 'PATIENT REFERRALS',
    description: 'Receive and manage participant referrals sent to your site by partner clinics.',
    icon: Share2,
    to: null,
    available: false,
    note: 'Not part of this build',
  },
  {
    id: 'trial-matching',
    title: 'TRIAL MATCHING SERVICES',
    description: 'Match participants already in your care to trials running across the network.',
    icon: Sparkles,
    to: null,
    available: false,
    note: 'Not part of this build',
  },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The landing screen after sign-in: choose which PatienTrials product to work in.
 *
 * The legacy version was three flat panels under a "SITE ADMINISTRATOR" banner,
 * with nothing to distinguish the product you use daily from the two you may
 * never open. The structure is unchanged — same three destinations, same order —
 * but the card you need leads, and it carries live figures so the choice is
 * informed rather than a click you make from memory every morning.
 */
export function WorkspaceHub() {
  const { user, role, signOut } = useAuth()
  const site = useAsync(() => siteApi.get(), [])
  const summary = useAsync(() => dashboardApi.get(), [])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/about">
                <CircleHelp aria-hidden="true" />
                <span className="hidden sm:inline">Help</span>
              </Link>
            </Button>

            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-secondary"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
                    aria-hidden="true"
                  >
                    {user ? initialsOf(`${user.firstName} ${user.lastName}`) : '—'}
                  </span>
                  <span className="hidden text-sm font-medium text-foreground sm:inline">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">Account menu</span>
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-64 rounded-lg border border-border bg-popover p-2 shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down-out"
                >
                  <div className="px-2.5 py-2">
                    <p className="text-sm font-medium text-foreground">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="border-t border-border pt-2">
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
            {role ? ROLE_LABELS[role] : 'Welcome'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
            {greeting()}
            {user ? `, ${user.firstName}` : ''}
          </h1>
          {site.isInitialLoading ? (
            <Skeleton className="mt-3 h-5 w-72" />
          ) : (
            <p className="mt-2 text-muted-foreground">
              {site.data?.name ?? 'Your site'} · Choose where you want to work.
            </p>
          )}

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WORKSPACES.map((workspace) => (
              <li key={workspace.id}>
                <WorkspaceCard
                  workspace={workspace}
                  stats={
                    workspace.id === 'site-solution' ? (
                      <SiteSolutionStats
                        loading={summary.isInitialLoading}
                        activeStudies={summary.data?.studies.active}
                        awaiting={summary.data?.pipeline.pending}
                      />
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}

/**
 * A product tile.
 *
 * The available tile is a button rather than a link because the automated suite
 * enters the console with `getByRole('button', { name: 'SITE SOLUTION' })`.
 */
function WorkspaceCard({
  workspace,
  stats,
}: {
  workspace: Workspace
  stats: React.ReactNode
}) {
  const navigate = useNavigate()
  const Icon = workspace.icon

  const body = (
    <>
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-xl transition-colors',
          workspace.available
            ? 'bg-brand/10 text-brand group-hover:bg-brand group-hover:text-brand-foreground'
            : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>

      <h2
        className={cn(
          'mt-5 text-base font-semibold tracking-[0.02em]',
          workspace.available ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {workspace.title}
      </h2>

      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{workspace.description}</p>

      <div className="mt-auto pt-6">
        {workspace.available ? (
          <>
            {stats}
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
              Open
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {workspace.note}
          </span>
        )}
      </div>
    </>
  )

  if (!workspace.to) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-dashed border-border bg-card/60 p-6">
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate(workspace.to!)}
      className={cn(
        'group flex h-full w-full flex-col rounded-xl border border-border bg-card p-6 text-left shadow-sm',
        'transition-[border-color,box-shadow,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md',
      )}
    >
      {body}
    </button>
  )
}

/**
 * Live figures on the card you are about to open, so the first thing you learn
 * is whether anything needs you — not after two more navigations.
 */
function SiteSolutionStats({
  loading,
  activeStudies,
  awaiting,
}: {
  loading: boolean
  activeStudies: number | undefined
  awaiting: number | undefined
}) {
  if (loading) {
    return (
      <div className="flex gap-6 border-t border-border pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
    )
  }

  if (activeStudies === undefined || awaiting === undefined) return null

  return (
    <dl className="flex gap-6 border-t border-border pt-4">
      <div>
        <dt className="text-xs text-muted-foreground">Active studies</dt>
        <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
          {formatCount(activeStudies)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Awaiting review</dt>
        <dd
          className={cn(
            'mt-0.5 text-xl font-semibold tabular-nums',
            awaiting > 0 ? 'text-warning' : 'text-foreground',
          )}
        >
          {formatCount(awaiting)}
        </dd>
      </div>
    </dl>
  )
}
