import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/store/useCurrentUser'
import type { Role } from '@/types'

export function RequireRole({ role }: { role: Role }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    return <Navigate to={user.role === 'staff' ? '/admin/garage' : '/dealer/auctions'} replace />
  }
  return <Outlet />
}
