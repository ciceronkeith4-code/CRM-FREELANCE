import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useCalendarEvents, type CalendarEvent, type CalendarEventType } from '@/features/calendar/api'
import { TaskForm } from '@/features/tasks/components/task-form'
import { TasksList } from '@/features/tasks/components/tasks-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { duration, ease } from '@/lib/motion'

const TYPE_COLORS: Record<CalendarEventType, string> = {
  deadline: 'bg-red-500',
  milestone: 'bg-purple-500',
  invoice_due: 'bg-amber-500',
  renewal: 'bg-blue-500',
  followup: 'bg-emerald-500',
  task: 'bg-slate-500',
}

const TYPE_LABELS: Record<CalendarEventType, string> = {
  deadline: 'Project deadline',
  milestone: 'Milestone',
  invoice_due: 'Invoice due',
  renewal: 'Renewal',
  followup: 'Follow-up',
  task: 'Task',
}

export function CalendarPage() {
  const [month, setMonth] = useState(() => new Date())
  // +1 when moving forward in time, -1 backward: the new month slides in from that side.
  const [direction, setDirection] = useState(0)
  const goTo = (next: Date) => {
    setDirection(Math.sign(startOfMonth(next).getTime() - startOfMonth(month).getTime()))
    setMonth(next)
  }
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const navigate = useNavigate()

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const { data: events } = useCalendarEvents(gridStart, gridEnd)

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events ?? []) {
      const key = e.date
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return map
  }, [events])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Deadlines, milestones, invoices, renewals, follow-ups, and tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => goTo(subMonths(month, 1))}>
            <ChevronLeft />
          </Button>
          <span className="w-32 text-center text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
          <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => goTo(addMonths(month, 1))}>
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={() => goTo(new Date())}>
            Today
          </Button>
          <Button size="sm" onClick={() => setTaskFormOpen(true)}>
            <Plus /> Add task
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(TYPE_LABELS) as CalendarEventType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', TYPE_COLORS[t])} />
            {TYPE_LABELS[t]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-xs font-medium text-muted-foreground">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-muted p-2 text-center">
            {d}
          </div>
        ))}
      </div>
      {/* Clipped so the sideways slide never widens the page (no scrollbar flash). */}
      <div className="overflow-x-clip">
        <motion.div
          key={format(monthStart, 'yyyy-MM')}
          initial={direction === 0 ? false : { opacity: 0, x: direction * 12 }}
          animate={{ opacity: 1, x: 0, transition: { duration: duration.overlay, ease: ease.out } }}
          className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border"
        >
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay.get(key) ?? []
            return (
              <Popover key={key}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={dayEvents.length === 0}
                    className={cn(
                      'flex min-h-20 flex-col gap-1 bg-background p-1.5 text-left align-top transition-colors duration-150 enabled:cursor-pointer enabled:hover:bg-muted/50 enabled:active:bg-muted sm:min-h-24',
                      !isSameMonth(day, month) && 'bg-muted/30 text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full text-xs',
                        isToday(day) && 'bg-primary text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span key={e.id} className="flex items-center gap-1 truncate text-[10px]">
                          <span className={cn('size-1.5 shrink-0 rounded-full', TYPE_COLORS[e.type])} />
                          <span className="truncate">{e.title}</span>
                        </span>
                      ))}
                      {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>}
                    </div>
                  </button>
                </PopoverTrigger>
                {dayEvents.length > 0 && (
                  <PopoverContent className="w-64" align="start">
                    <p className="mb-2 text-sm font-medium">{format(day, 'MMM d, yyyy')}</p>
                    <div className="flex flex-col gap-1.5">
                      {dayEvents.map((e) => (
                        <button
                          key={e.id}
                          disabled={!e.path}
                          onClick={() => e.path && navigate(e.path)}
                          className={cn('flex items-center gap-2 rounded-md p-1.5 text-left text-sm transition-colors duration-150', e.path && 'hover:bg-muted active:bg-muted/70')}
                        >
                          <span className={cn('size-2 shrink-0 rounded-full', TYPE_COLORS[e.type])} />
                          <span className={isSameDay(day, new Date()) ? 'font-medium' : ''}>{e.title}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            )
          })}
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TasksList />
        </CardContent>
      </Card>

      <TaskForm open={taskFormOpen} onOpenChange={setTaskFormOpen} />
    </div>
  )
}
