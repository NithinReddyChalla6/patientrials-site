import * as React from 'react'
import { auth, type Session } from '@/data/api'
import type { Role, User } from '@/data/types'
import { can, type Permission } from './roles'

interface AuthContextValue {
  session: Session | null
  user: User | null
  role: Role | undefined
  signIn: (email: string, password: string) => Promise<Session>
  signOut: () => void
  /** Demo affordance: view the console as another role without re-authenticating. */
  switchRole: (role: Role) => void
  can: (permission: Permission) => boolean
  ready: boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'patientrials.site.session'

/**
 * Session state.
 *
 * There is no identity provider behind this reference build, so the session is
 * whatever the mock API returned, kept in sessionStorage so a page refresh does
 * not throw the user back to the login screen mid-workflow.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setSession(JSON.parse(raw) as Session)
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
    setReady(true)
  }, [])

  const persist = React.useCallback((next: Session | null) => {
    setSession(next)
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role: session?.user.role,
      ready,
      signIn: async (email, password) => {
        const next = await auth.login(email, password)
        persist(next)
        return next
      },
      signOut: () => persist(null),
      switchRole: (role) => {
        if (!session) return
        persist({ ...session, user: { ...session.user, role } })
      },
      can: (permission) => can(session?.user.role, permission),
    }),
    [session, ready, persist],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
