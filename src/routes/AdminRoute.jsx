import { Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AccessDenied from '@/components/AccessDenied'

export default function AdminRoute() {
  const { user } = useAuth()
  if (!user?.is_app_admin) return <AccessDenied />
  return <Outlet />
}
