import { cn } from '@/lib/utils'

type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'purple'

const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
  gray: 'bg-muted text-muted-foreground',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400',
}

const STATUS_TONE: Record<string, Tone> = {
  // Leads
  New: 'gray',
  Contacted: 'blue',
  Interested: 'blue',
  'Proposal Sent': 'amber',
  Negotiating: 'amber',
  Won: 'green',
  Lost: 'red',
  // Quotations / Invoices / generic
  Draft: 'gray',
  Sent: 'blue',
  Accepted: 'green',
  Declined: 'red',
  Expired: 'red',
  'Partially Paid': 'amber',
  Paid: 'green',
  Overdue: 'red',
  Cancelled: 'gray',
  // Projects
  Planning: 'gray',
  'In Progress': 'blue',
  'On Hold': 'amber',
  'For Review': 'purple',
  Completed: 'green',
  // Milestones / change requests / licenses / recurring / tasks
  Pending: 'gray',
  Invoiced: 'blue',
  Requested: 'gray',
  Approved: 'blue',
  Done: 'green',
  Active: 'green',
  Paused: 'amber',
  Revoked: 'red',
  'Support Expired': 'red',
  // Payment status badges
  Unpaid: 'red',
  'Fully Paid': 'green',
  // Deadline indicator
  'On track': 'green',
  'Due soon': 'amber',
  // Task priority
  Low: 'gray',
  Medium: 'amber',
  High: 'red',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? 'gray'
  return (
    <span
      className={cn(
        // Colour eases when a status changes in place (e.g. an invoice going Sent → Paid).
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 ease-out',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {status}
    </span>
  )
}
