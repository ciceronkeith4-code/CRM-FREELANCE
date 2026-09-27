import type { ReactNode } from 'react'
import { Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

export function ReportSection({
  title,
  rows,
  filename,
  loading = false,
  updating = false,
  children,
}: {
  title: string
  rows: Record<string, unknown>[]
  filename: string
  /** First load: show placeholder rows. */
  loading?: boolean
  /** A new date range is loading: keep the previous figures visible, dimmed. */
  updating?: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="outline" size="sm" disabled={rows.length === 0 || loading} onClick={() => downloadCsv(filename, rows)}>
          <Download /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3 py-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4" style={{ opacity: 1 - i * 0.15 }}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div aria-busy={updating} className={cn('transition-opacity duration-200 ease-out', updating && 'opacity-60')}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
