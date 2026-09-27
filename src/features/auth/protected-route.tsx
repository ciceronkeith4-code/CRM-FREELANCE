import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { Spinner } from '@/components/ui/spinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
