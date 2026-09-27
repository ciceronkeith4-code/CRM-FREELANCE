import { formatDate, formatDateTime } from '@/lib/format'

export function DateText({ date, withTime, className }: { date: string | Date | null | undefined; withTime?: boolean; className?: string }) {
  return <span className={className}>{withTime ? formatDateTime(date) : formatDate(date)}</span>
}
