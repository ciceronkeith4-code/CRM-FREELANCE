import { useState } from 'react'
import { Trash2, MessageSquare, Phone, Users, Mail, FileText, Handshake } from 'lucide-react'
import { useActivities, useCreateActivity, useDeleteActivity } from '@/features/activities/api'
import type { ActivityType, EntityType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateText } from '@/components/shared/date-text'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { todayISO } from '@/lib/format'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const ACTIVITY_TYPES: ActivityType[] = ['Call', 'Meeting', 'Message', 'Email', 'Note', 'Agreement']

const ACTIVITY_ICONS: Record<ActivityType, typeof Phone> = {
  Call: Phone,
  Meeting: Users,
  Message: MessageSquare,
  Email: Mail,
  Note: FileText,
  Agreement: Handshake,
}

export function ActivityTimeline({ entityType, entityId }: { entityType: EntityType; entityId: string | undefined }) {
  const { data: activities, isLoading } = useActivities(entityType, entityId)
  const createActivity = useCreateActivity(entityType, entityId)
  const deleteActivity = useDeleteActivity(entityType, entityId)

  const [type, setType] = useState<ActivityType>('Note')
  const [date, setDate] = useState(() => todayISO())
  const [content, setContent] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleAdd = () => {
    if (!content.trim()) return
    createActivity.mutate(
      { type, date, content },
      { onSuccess: () => setContent('') },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
            <SelectTrigger className="w-36" aria-label="Activity type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" aria-label="Activity date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        </div>
        <Textarea
          placeholder="What happened?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={createActivity.isPending || !content.trim()}>
            Add
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && activities?.length === 0 && (
        <EmptyState icon={MessageSquare} title="No activity yet" description="Calls, meetings, and notes will show up here." />
      )}

      <div className="flex flex-col gap-3">
        {activities?.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type]
          return (
            <div key={activity.id} className="group flex gap-3 border-l-2 border-border pl-3">
              <div className="-ml-[19px] flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{activity.type}</span>
                  <div className="flex items-center gap-2">
                    <DateText date={activity.date} className="text-xs text-muted-foreground" />
                    <button
                      type="button"
                      aria-label="Delete activity"
                      onClick={() => setDeleteId(activity.id)}
                      className="transition-opacity focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
                {activity.content && <p className="text-sm text-muted-foreground">{activity.content}</p>}
              </div>
            </div>
          )
        })}
      </div>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this activity?"
        onConfirm={() => {
          if (deleteId) deleteActivity.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
