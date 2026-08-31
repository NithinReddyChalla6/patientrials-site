import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/auth-context'
import { NAV_GROUPS } from './nav-config'
import { Brand } from './brand'

/**
 * Site Solution navigation.
 *
 * Grouped by the job each destination serves, so the daily work sits at the top
 * and the setup screens read as setup. Items the signed-in role cannot use are
 * removed rather than shown disabled — a nav is a map of where you can go.
 */
export function ConsoleSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth()

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full flex-col bg-sunken">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Brand />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.id} className="mb-4 last:mb-0">
            <h2 className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground/80">
              {group.label}
            </h2>
            <ul className="space-y-px">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex min-h-8 items-center gap-2.5 rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors',
                        isActive
                          ? 'bg-card font-semibold text-foreground shadow-sm'
                          : 'font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand"
                            aria-hidden="true"
                          />
                        )}
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
    </div>
  )
}
