import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!envUrl && !!envAnonKey

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Add them to .env.local before signing in.',
  )
}

// Fall back to a syntactically valid placeholder so createClient doesn't throw
// at import time when credentials haven't been configured yet — the app can
// still render (e.g. the login page); any real Supabase call will just fail.
const url = envUrl || 'https://placeholder.supabase.co'
const anonKey = envAnonKey || 'placeholder-anon-key'

export const supabase = createClient<Database>(url, anonKey)

export const ATTACHMENTS_BUCKET = 'attachments'
