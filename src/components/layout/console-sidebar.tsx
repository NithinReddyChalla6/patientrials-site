import { ArrowLeft } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/auth-context'
import { NAV_GROUPS, STUDY_TABS } from './nav-config'
import { Brand } from './brand'

/** Shared row styling, so the two navigations read as one component. */
const row = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex min-h-8 items-center gap-2.5 rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors',
    isActive
      ? 'bg-card font-semibold text-foreground shadow-sm'
      : 'font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground',
  )

function ActiveMark({ isActive }: { isActive: boolean }) {
  if (!isActive) return null
  return (
    <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand" aria-hidden="true" />
  )
}

/**
 * The study the URL is inside, if any.
 *
 * `/studies/new` is the create form rather than a study, so it keeps the site
 * navigation: there is nothing yet to navigate within.
 */
function studyIdFrom(pathname: string): string | undefined {
  const [, section, id] = pathname.split('/')
  if (section !== 'studies' || !id || id === 'new') return undefined
  return id
}

/**
 * Site Solution navigation.
 *
 * Two navigations in one rail, swapped by context. Outside a study it lists the
 * site's destinations, grouped by the job each serves. Inside one it becomes
 * that study's own sections.
 *
 * Those sections were a horizontal strip until a study grew to a dozen of them
 * and the strip began to scroll sideways — which hides the tabs at the end
 * behind a gesture nobody makes, so an investigator had no way to learn that
 * Patient Notes or the transfer screens existed. A vertical rail shows all of
 * them at once and costs one row per section added.
 *
 * Items the signed-in role cannot use are removed rather than shown disabled.
 * A nav is a map of where you can go.
 */
export function ConsoleSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth()
  const { pathname } = useLocation()
  const studyId = studyIdFrom(pathname)

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0)

  const tabs = STUDY_TABS.filter((tab) => !tab.permission || can(tab.permission))

  return (
    <div className="flex h-full flex-col bg-sunken">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Brand />
      </div>

      {studyId ? (
        <nav aria-label="Study sections" className="flex-1 overflow-y-auto px-2 py-3">
          {/* The way out comes first. Entering a study should never feel like a
              place you have to find your way back from. */}
          <NavLink
            to="/studies"
            // Without `end`, `/studies` prefix-matches the study you are inside
            // and the way out marks itself as where you already are.
            end
            onClick={onNavigate}
            className="flex min-h-8 items-center gap-2.5 rounded-md px-3 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:bg-card/70 hover:text-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            All studies
          </NavLink>

          <h2 className="mt-4 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground/80">
            Study
          </h2>
          <p className="id truncate px-3 pb-2 pt-0.5 text-[0.8125rem] font-semibold text-foreground">
            {studyId}
          </p>

          <ul className="space-y-px">
            {tabs.map((tab) => (
              <li key={tab.segment}>
                <NavLink
                  to={`/studies/${studyId}/${tab.segment}`}
                  onClick={onNavigate}
                  className={row}
                >
                  {({ isActive }) => (
                    <>
                      <ActiveMark isActive={isActive} />
                      <tab.icon
                        className={cn('size-4 shrink-0', isActive && 'text-brand')}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              <h2 className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground/80">
                {group.label}
              </h2>
              <ul className="space-y-px">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} onClick={onNavigate} className={row}>
                      {({ isActive }) => (
                        <>
                          <ActiveMark isActive={isActive} />
                          <item.icon
                            className={cn('size-4 shrink-0', isActive && 'text-brand')}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </div>
  )
}
