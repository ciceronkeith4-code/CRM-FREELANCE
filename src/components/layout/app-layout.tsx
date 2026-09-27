import { Suspense } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { CommandPalette } from '@/components/layout/command-palette'
import { TopProgressBar } from '@/components/layout/top-progress-bar'
import { PageSkeleton } from '@/components/shared/skeletons'
import { fadeUp } from '@/lib/motion'

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <TopProgressBar />
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        {/* Only the page content animates on navigation; sidebar and header stay put.
            Enter-only (no exit) so the new page shows immediately instead of waiting. */}
        <motion.div
          key={pathname}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6"
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </SidebarInset>
      <CommandPalette />
      {/* Scroll to top on new pages; restore position when going back. */}
      <ScrollRestoration />
    </SidebarProvider>
  )
}
