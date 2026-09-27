import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/** Page title + subtitle placeholder, matching every list page's header. */
export function HeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 max-w-[60vw]" />
      </div>
      {withAction && <Skeleton className="h-8 w-28" />}
    </div>
  )
}

/** Mirrors DataTable: table on md+, stacked cards on mobile. */
export function TableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-md md:block">
        <div className="flex gap-4 border-b px-2 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: i === 0 ? 180 : 120 }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 border-b px-2 py-3.5 last:border-0">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" style={{ maxWidth: c === 0 ? 200 : 110, opacity: 1 - r * 0.08 }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2.5 p-4">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function StatCardsSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ChartSkeleton({ variant = 'bars' }: { variant?: 'bars' | 'donut' }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="flex h-72 items-end justify-center gap-2 pb-8">
        {variant === 'bars' ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="w-full max-w-6" style={{ height: `${25 + ((i * 37) % 60)}%` }} />
          ))
        ) : (
          <Skeleton className="mb-6 size-44 rounded-full" />
        )}
      </CardContent>
    </Card>
  )
}

/** Detail pages: title bar, stat tiles, and two info cards. */
export function DetailSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-6 w-56" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      {stats > 0 && <StatCardsSkeleton count={stats} />}
      <Skeleton className="h-8 w-full max-w-lg" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, r) => (
                <div key={r} className="flex justify-between gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Fallback while a lazily-loaded page's code downloads. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <HeaderSkeleton />
      <TableSkeleton />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <StatCardsSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton variant="donut" />
      </div>
    </div>
  )
}
