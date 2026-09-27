import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toastError } from '@/lib/errors'

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    // Only toast background refetch failures; first-load failures are shown by the page itself.
    onError: (error, query) => {
      if (query.state.data !== undefined) toastError(error, 'Could not refresh data')
    },
  }),
  mutationCache: new MutationCache({
    // Every failed save/delete surfaces a message, even where the caller didn't add onError.
    onError: (error) => toastError(error),
    // Financial figures are derived across modules (an expense changes project profit,
    // a renewal changes income and client totals), so refresh everything on screen.
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
