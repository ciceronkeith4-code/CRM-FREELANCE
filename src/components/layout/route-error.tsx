import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RouteError() {
  const error = useRouteError()
  // Rendered directly by the catch-all "*" route there is no error object: that's a 404.
  const notFound = !error || (isRouteErrorResponse(error) && error.status === 404)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="size-8 text-muted-foreground" />
      <h1 className="font-heading text-xl font-semibold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {notFound ? "That page doesn't exist." : 'An unexpected error occurred. Reloading usually fixes it.'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Button asChild>
          <Link to="/">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
