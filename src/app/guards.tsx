import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/shared/auth/session'
import { hasAnyPermission, type Permission } from '@/shared/auth/permissions'
import { LoadingState, EmptyState } from '@/shared/ui'

/** Gates a route on authentication; redirects to /login otherwise. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()

  if (status === 'loading') return <LoadingState label="Restoring session…" />
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <>{children}</>
}

/** Gates a route on holding at least one of the required permissions. */
export function RequirePermission({
  anyOf,
  children,
}: {
  anyOf: Permission[]
  children: React.ReactNode
}) {
  const permissionSet = useSessionStore((s) => s.permissionSet)
  if (anyOf.length > 0 && !hasAnyPermission(permissionSet, anyOf)) {
    return (
      <EmptyState
        title="No access"
        description="You don't have permission to view this section. Contact a Super Admin if you believe this is an error."
      />
    )
  }
  return <>{children}</>
}
