import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null // placeholder — real loading state pending UI pass
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
