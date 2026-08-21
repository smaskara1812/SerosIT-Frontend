import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function AdminRoute() {
  const { user } = useAuth()
  if (!user?.is_app_admin) return <Navigate to="/" replace />
  return <Outlet />
}
