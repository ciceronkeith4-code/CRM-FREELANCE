import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { useTimeLogs, useCreateTimeLog, useDeleteTimeLog } from '@/features/projects/time-logs-api'
import { useChangeRequests } from '@/features/projects/change-requests-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateText } from '@/components/shared/date-text'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { todayISO } from '@/lib/format'
import { toast } from 'sonner'

export function TimeLogsTab({ projectId }: { projectId: string }) {
  const { data: logs, isLoading } = useTimeLogs(projectId)
  const { data: changeRequests } = useChangeRequests(projectId)
  const createLog = useCreateTimeLog(projectId)
  const deleteLog = useDeleteTimeLog(projectId)

  const [date, setDate] = useState(() => todayISO())
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [changeRequestId, setChangeRequestId] = useState<string>('none')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const totalHours = logs?.reduce((sum, l) => sum + l.hours, 0) ?? 0

  const handleAdd = () => {
    const h = Number(hours)
    if (!hours || !(h > 0) || h > 24) {
      toast.error('Hours must be more than 0 and at most 24')
      return
    }
    createLog.mutate(
      {
        date,
        hours: Number(hours),
        description: description || null,
        change_request_id: changeRequestId === 'none' ? null : changeRequestId,
      },
      {
        onSuccess: () => {
          setHours('')
          setDescription('')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2 rounded-lg border p-3">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36" />
          <Input placeholder="Hours" aria-label="Hours" type="number" min="0.25" max="24" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} className="w-24" />
          <Textarea placeholder="What did you work on?" value={description} onChange={(e) => setDescription(e.target.value)} rows={1} className="min-w-40 flex-1" />
          {changeRequests && changeRequests.length > 0 && (
            <Select value={changeRequestId} onValueChange={setChangeRequestId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Change request" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change request</SelectItem>
                {changeRequests.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>
                    {cr.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button size="sm" onClick={handleAdd} disabled={createLog.isPending}>
          <Plus /> Log
        </Button>
      </div>

      {!isLoading && logs?.length === 0 && (
        <EmptyState icon={Clock} title="No time logged yet" description="Log hours as you work to track your effective rate." />
      )}

      {(logs?.length ?? 0) > 0 && (
        <p className="text-sm text-muted-foreground">Total logged: {totalHours}h</p>
      )}

      <div className="flex flex-col gap-1.5">
        {logs?.map((log) => (
          <div key={log.id} className="group flex items-center gap-3 rounded-md border p-2.5 text-sm">
            <DateText date={log.date} className="w-24 shrink-0 text-muted-foreground" />
            <span className="w-14 shrink-0 font-medium">{log.hours}h</span>
            <span className="flex-1 truncate text-muted-foreground">{log.description}</span>
            {log.change_requests?.title && <span className="shrink-0 text-xs text-muted-foreground">{log.change_requests.title}</span>}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete time log"
              className="md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => setDeleteId(log.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this time log?"
        onConfirm={() => {
          if (deleteId) deleteLog.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
