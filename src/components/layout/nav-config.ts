import {
  LayoutDashboard,
  CalendarDays,
  Target,
  FileText,
  Users,
  FolderKanban,
  Receipt,
  Wallet,
  ReceiptText,
  RefreshCw,
  Package,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Calendar', to: '/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Leads', to: '/leads', icon: Target },
      { label: 'Quotations', to: '/quotations', icon: FileText },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Clients', to: '/clients', icon: Users },
      { label: 'Projects', to: '/projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Invoices', to: '/invoices', icon: Receipt },
      { label: 'Payments', to: '/payments', icon: Wallet },
      { label: 'Expenses', to: '/expenses', icon: ReceiptText },
      { label: 'Recurring Services', to: '/recurring-services', icon: RefreshCw },
      { label: 'Products & Licenses', to: '/products', icon: Package },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Reports', to: '/reports', icon: BarChart3 }],
  },
  {
    label: 'Settings',
    items: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
]
