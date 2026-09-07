import { Navigate, Outlet, useOutletContext } from 'react-router-dom'
import { useAuth } from './auth-context'
import type { Permission } from './roles'

/**
 * Route guard for one capability.
 *
 * Leaving a destination out of the sidebar is presentation; this makes it a
 * boundary, so typing the address does not reach a screen the signed-in role
 * has no business on. Anyone without it is returned to their own landing
 * screen rather than shown an error they cannot act on.
 *
 * It sits between a layout route and its children, so it has to hand the outlet
 * context straight through. A bare <Outlet /> would replace that context with
 * nothing, and every screen below reading it would break.
 */
export function RequirePermission({ permission }: { permission: Permission }) {
  const { can, ready } = useAuth()
  const context = useOutletContext()

  if (!ready) return null
  if (!can(permission)) return <Navigate to="/hub" replace />

  return <Outlet context={context} />
}
