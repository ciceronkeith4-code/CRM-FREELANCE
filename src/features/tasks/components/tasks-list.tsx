import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { isPast, isToday, parseISO } from 'date-fns'
import { Trash2, ListChecks } from 'lucide-react'
import { useTasks, useToggleTask, useDeleteTask } from '@/features/tasks/api'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/shared/date-text'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { listItem } from '@/lib/motion'

/** A task just ticked off stays in the list this long, so the check registers before it leaves. */
const LINGER_MS = 600

export function TasksList() {
  const { data: tasks, isLoading } = useTasks()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const [showDone, setShowDone] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [lingering, setLingering] = useState<ReadonlySet<string>>(() => new Set())
  const timers = useRef(new Map<string, number>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  const toggle = (id: string, done: boolean) => {
    toggleTask.mutate({ id, done })
    if (!done || showDone) return
    setLingering((prev) => new Set(prev).add(id))
    window.clearTimeout(timers.current.get(id))
    timers.current.set(
      id,
      window.setTimeout(() => {
        timers.current.delete(id)
        setLingering((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, LINGER_MS),
    )
  }

  const visible = useMemo(() => {
    const list = tasks ?? []
    return showDone ? list : list.filter((t) => !t.done || lingering.has(t.id))
  }, [tasks, showDone, lingering])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setShowDone((s) => !s)}>
          {showDone ? 'Hide done' : 'Show done'}
        </Button>
      </div>

      {visible.length === 0 && (
        <EmptyState icon={ListChecks} title="No tasks" description="Use “Add task” above to create a reminder." />
      )}

      <div className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {visible.map((task) => {
            const overdue = !task.done && !!task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
            return (
              <motion.div
                key={task.id}
                layout="position"
                variants={listItem}
                initial="hidden"
                animate="show"
                exit="exit"
                className="group flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors duration-150 hover:bg-muted/40"
              >
                <Checkbox
                  checked={task.done}
                  aria-label={`Mark "${task.title}" as done`}
                  onCheckedChange={(checked) => toggle(task.id, !!checked)}
                />
                <span className={cn('flex-1 transition-colors duration-200', task.done && 'text-muted-foreground line-through')}>{task.title}</span>
                <StatusBadge status={task.priority} />
                {task.due_date && (
                  <DateText date={task.due_date} className={cn('text-xs text-muted-foreground', overdue && 'font-medium text-red-500')} />
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label="Delete task"
                  onClick={() => setDeleteId(task.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this task?"
        onConfirm={() => {
          if (deleteId) deleteTask.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
