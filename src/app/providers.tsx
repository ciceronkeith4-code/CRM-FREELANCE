import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'motion/react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/query-client'
import { duration, ease } from '@/lib/motion'
import { AuthProvider } from '@/features/auth/auth-context'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user": when the OS asks for reduced motion, Motion skips
    // transform animations and keeps opacity fades.
    <MotionConfig reducedMotion="user" transition={{ duration: duration.overlay, ease: ease.out }}>
      {/* Swap themes instantly; the toggle icon animates instead of every color on the page. */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider delayDuration={300} skipDelayDuration={150}>
              {children}
              <Toaster position="top-right" richColors closeButton duration={4000} visibleToasts={4} gap={8} />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
