import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'

export default function MastersRoute() {
  const { user } = useAuth()
  const masters = navTree.find((item) => item.key === 'masters')
  const hasAnyAccess =
    user?.is_app_admin ||
    masters.sections.some((s) => s.items.some((i) => can(user, i.menuKey)))

  if (!hasAnyAccess) return <Navigate to="/" replace />
  return <Outlet />
}
