import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const lastUserId = useRef<string | null>(null)

  useEffect(() => {
    const apply = (next: Session | null) => {
      const nextUserId = next?.user.id ?? null
      // Never let one account's cached records show up for another (or after sign-out).
      if (lastUserId.current !== nextUserId) {
        queryClient.clear()
        lastUserId.current = nextUserId
      }
      setSession(next)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => apply(newSession))

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
