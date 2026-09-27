import { useState } from 'react'
import { Plus, Trash2, GitPullRequestArrow } from 'lucide-react'
import {
  useChangeRequests,
  useCreateChangeRequest,
  useUpdateChangeRequest,
  useDeleteChangeRequest,
} from '@/features/projects/change-requests-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { ChangeRequestStatus, RequestedVia } from '@/types/database'
import { todayISO } from '@/lib/format'
import { toast } from 'sonner'

const STATUSES: ChangeRequestStatus[] = ['Requested', 'Approved', 'In Progress', 'Done', 'Declined']
const VIAS: RequestedVia[] = ['Messenger', 'Viber', 'Email', 'Call', 'Meeting', 'Other']

export function ChangeRequestsTab({ projectId }: { projectId: string }) {
  const { data: requests, isLoading } = useChangeRequests(projectId)
  const createRequest = useCreateChangeRequest(projectId)
  const updateRequest = useUpdateChangeRequest(projectId)
  const deleteRequest = useDeleteChangeRequest(projectId)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [via, setVia] = useState<RequestedVia>('Messenger')
  const [extraCharge, setExtraCharge] = useState('0')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleAdd = () => {
    if (!title.trim()) {
      toast.error('Enter a title for the change request')
      return
    }
    if (Number(extraCharge) < 0 || Number(estimatedHours) < 0) {
      toast.error('Charge and hours cannot be negative')
      return
    }
    createRequest.mutate(
      {
        title,
        description: description || null,
        requested_via: via,
        extra_charge: Number(extraCharge) || 0,
        estimated_hours: estimatedHours ? Number(estimatedHours) : null,
        status: 'Requested',
      },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
          setExtraCharge('0')
          setEstimatedHours('')
          setOpen(false)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!isLoading && requests?.length === 0 && !open && (
        <EmptyState
          icon={GitPullRequestArrow}
          title="No change requests"
          description="Track scope changes and what they cost."
          actionLabel="Add change request"
          onAction={() => setOpen(true)}
        />
      )}

      <div className="flex flex-col gap-2">
        {requests?.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.title}</p>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Delete change request" onClick={() => setDeleteId(r.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <DateText date={r.date_requested} className="text-muted-foreground" />
              {r.requested_via && <span className="text-muted-foreground">via {r.requested_via}</span>}
              <Money amount={r.extra_charge} className="font-medium" />
              {r.estimated_hours != null && <span className="text-muted-foreground">{r.estimated_hours}h est.</span>}
              <Select
                value={r.status}
                onValueChange={(v) =>
                  updateRequest.mutate({
                    id: r.id,
                    status: v as ChangeRequestStatus,
                    date_completed: v === 'Done' ? todayISO() : r.date_completed,
                  })
                }
              >
                <SelectTrigger className="ml-auto w-32" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <StatusBadge status={s} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {open ? (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Select value={via} onValueChange={(v) => setVia(v as RequestedVia)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIAS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Extra charge"
              aria-label="Extra charge"
              type="number"
              min="0"
              step="0.01"
              value={extraCharge}
              onChange={(e) => setExtraCharge(e.target.value)}
              className="w-32"
            />
            <Input
              placeholder="Est. hours"
              aria-label="Estimated hours"
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={createRequest.isPending}>
              Add
            </Button>
          </div>
        </div>
      ) : (
        requests && requests.length > 0 && (
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
            <Plus /> Add change request
          </Button>
        )
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this change request?"
        onConfirm={() => {
          if (deleteId) deleteRequest.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
