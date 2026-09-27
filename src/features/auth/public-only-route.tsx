import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { Spinner } from '@/components/ui/spinner'

/** Login/sign-up/forgot-password: signed-in users go straight to the app. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  return user ? <Navigate to="/" replace /> : <Outlet />
}
