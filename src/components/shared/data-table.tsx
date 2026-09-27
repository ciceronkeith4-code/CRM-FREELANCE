import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/shared/skeletons'
import { listItem } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  /** Hide this column in the mobile stacked-card view (e.g. redundant with the card title). */
  hideOnMobileCard?: boolean
}

const MotionRow = motion.create(TableRow)
const MotionCard = motion.create(Card)

/** Above this many rows, skip layout (reflow) animations to keep scrolling smooth. */
const LAYOUT_ANIMATION_LIMIT = 60

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  onRowHover,
  isLoading,
  emptyState,
  mobileTitle,
  rowClassName,
}: {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  /** e.g. prefetch the detail page before the click lands */
  onRowHover?: (row: T) => void
  isLoading?: boolean
  emptyState?: ReactNode
  mobileTitle: (row: T) => ReactNode
  rowClassName?: (row: T) => string | undefined
}) {
  const flashing = useChangedRows(data, getRowId)
  // Stagger only the first time rows appear; later additions animate in without delay.
  const [introDone, setIntroDone] = useState(false)
  useEffect(() => {
    if (introDone || data.length === 0) return
    const t = window.setTimeout(() => setIntroDone(true), 400)
    return () => window.clearTimeout(t)
  }, [data.length, introDone])

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  const layout = data.length <= LAYOUT_ANIMATION_LIMIT ? ('position' as const) : false

  const interactiveProps = (row: T) =>
    onRowClick
      ? {
          tabIndex: 0,
          onClick: () => onRowClick(row),
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onRowClick(row)
            }
          },
        }
      : {}

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial>
              {data.map((row, index) => {
                const id = getRowId(row)
                return (
                  <MotionRow
                    key={id}
                    layout={layout}
                    variants={listItem}
                    custom={introDone ? 0 : index}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className={cn(
                      'transition-colors duration-150',
                      onRowClick &&
                        'cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
                      flashing.has(id) && 'row-flash',
                      rowClassName?.(row),
                    )}
                    onMouseEnter={onRowHover ? () => onRowHover(row) : undefined}
                    {...interactiveProps(row)}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </MotionRow>
                )
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-2 md:hidden">
        <AnimatePresence initial>
          {data.map((row, index) => {
            const id = getRowId(row)
            return (
              <MotionCard
                key={id}
                layout={layout}
                variants={listItem}
                custom={introDone ? 0 : index}
                initial="hidden"
                animate="show"
                exit="exit"
                className={cn(
                  'transition-colors duration-150',
                  onRowClick && 'cursor-pointer outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted/60',
                  flashing.has(id) && 'row-flash',
                  rowClassName?.(row),
                )}
                onTouchStart={onRowHover ? () => onRowHover(row) : undefined}
                {...interactiveProps(row)}
              >
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="font-medium">{mobileTitle(row)}</div>
                  {columns
                    .filter((c) => !c.hideOnMobileCard && c.header)
                    .map((col) => (
                      <div key={col.key} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{col.header}</span>
                        <span className="min-w-0 text-right">{col.render(row)}</span>
                      </div>
                    ))}
                </CardContent>
              </MotionCard>
            )
          })}
        </AnimatePresence>
      </div>
    </>
  )
}

/**
 * Returns ids of rows whose contents changed since the last render (not new
 * rows, not the first load), for ~1.4s — so an edited row briefly glows.
 */
function useChangedRows<T>(data: T[], getRowId: (row: T) => string) {
  const previous = useRef<Map<string, string> | null>(null)
  const [changed, setChanged] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const next = new Map<string, string>()
    for (const row of data) next.set(getRowId(row), JSON.stringify(row))

    const prev = previous.current
    previous.current = next
    if (!prev) return

    const ids: string[] = []
    for (const [id, signature] of next) {
      const before = prev.get(id)
      if (before !== undefined && before !== signature) ids.push(id)
    }
    if (ids.length > 0) setChanged(new Set(ids))
    // getRowId is stable per table in practice; only react to data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Clear the highlight after it has faded (independent of further data changes).
  useEffect(() => {
    if (changed.size === 0) return
    const t = window.setTimeout(() => setChanged(new Set()), 1400)
    return () => window.clearTimeout(t)
  }, [changed])

  return changed
}
