import { Search, LogOut } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { useUiStore } from '@/stores/ui-store'
import { useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function Topbar() {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const { user } = useAuth()
  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 print:hidden">
      <SidebarTrigger />
      <Button
        variant="outline"
        size="sm"
        className="ml-1 flex-1 justify-start text-muted-foreground sm:max-w-xs"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search />
        Search...
        <Kbd className="ml-auto hidden sm:inline-flex">Ctrl K</Kbd>
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
              <Avatar className="size-7">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => supabase.auth.signOut()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
