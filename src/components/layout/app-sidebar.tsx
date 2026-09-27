import { Link, useLocation } from 'react-router-dom'
import logoFull from '@/assets/logo.png'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { NAV_GROUPS } from '@/components/layout/nav-config'

export function AppSidebar() {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader className="shrink-0 border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img
            src="/favicon.png"
            alt="FreelanceOS"
            className="hidden size-7 shrink-0 group-data-[collapsible=icon]:block dark:brightness-0 dark:invert"
          />
          <img src={logoFull} alt="FreelanceOS" className="h-6 w-auto shrink-0 group-data-[collapsible=icon]:hidden dark:brightness-0 dark:invert" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
