import { toast } from 'sonner'

interface MaybePostgresError {
  message?: string
  code?: string
  details?: string
}

/** Turns Supabase/Postgres/network errors into a message a person can act on. */
export function friendlyErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = (err ?? {}) as MaybePostgresError
  const message = typeof e.message === 'string' ? e.message : ''

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Can't reach the server. Check your internet connection and try again."
  }
  switch (e.code) {
    case '23505':
      return 'That record already exists (duplicate value).'
    case '23503':
      return 'This record is linked to other records, so it can’t be saved or deleted that way.'
    case '23514':
      return 'Some values aren’t allowed — check for negative amounts, a percent over 100, or dates that end before they start.'
    case '23502':
      return 'A required field is missing.'
    case '42501':
      return 'You don’t have permission to do that.'
    case 'PGRST116':
      return 'That record could not be found.'
  }
  // Exceptions raised from our own database functions are already written for people.
  if (e.code === 'P0001' && message) return message
  return message || fallback
}

/**
 * Shows an error toast. Uses the message as the toast id so the same error
 * raised by both a form's catch block and the global mutation handler only
 * appears once.
 */
export function toastError(err: unknown, fallback?: string) {
  const message = friendlyErrorMessage(err, fallback)
  toast.error(message, { id: `error:${message}` })
}
