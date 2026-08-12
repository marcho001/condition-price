import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/store/useCurrentUser'
import type { Role, StaffRole } from '@/types'

/**
 * staffRoles 用來把拍賣設定擋在拍賣營運手上——車輛登錄員只做車輛登錄，
 * 這是 Phase 1 §1.1 的角色分工。
 */
export function RequireRole({ role, staffRoles }: { role: Role; staffRoles?: StaffRole[] }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    return <Navigate to={user.role === 'staff' ? '/admin/garage' : '/dealer/auctions'} replace />
  }
  if (staffRoles && (!user.staffRole || !staffRoles.includes(user.staffRole))) {
    return <Navigate to="/admin/garage" replace />
  }
  return <Outlet />
}
