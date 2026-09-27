import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Sparkles, Milestone as MilestoneIcon } from 'lucide-react'
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useGenerateStandardMilestones,
} from '@/features/projects/milestones-api'
import { useSettings } from '@/features/settings/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { MilestoneStatus } from '@/types/database'

const STATUSES: MilestoneStatus[] = ['Pending', 'Invoiced', 'Paid']

export function MilestonesTab({ projectId, basePrice }: { projectId: string; basePrice: number }) {
  const { data: milestones, isLoading } = useMilestones(projectId)
  const createMilestone = useCreateMilestone(projectId)
  const updateMilestone = useUpdateMilestone(projectId)
  const deleteMilestone = useDeleteMilestone(projectId)
  const generateStandard = useGenerateStandardMilestones(projectId)
  const { data: settings } = useSettings()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleAdd = () => {
    if (!title.trim()) {
      toast.error('Enter a milestone title')
      return
    }
    if (Number(amount) < 0) {
      toast.error('Amount cannot be negative')
      return
    }
    createMilestone.mutate(
      { title, amount: Number(amount) || 0, due_date: dueDate || null, status: 'Pending' },
      {
        onSuccess: () => {
          setTitle('')
          setAmount('')
          setDueDate('')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {(milestones?.length ?? 0) === 0 && !isLoading && (
        <Button
          variant="outline"
          className="w-fit"
          onClick={() =>
            generateStandard.mutate(
              { basePrice, downpaymentPercent: settings?.default_downpayment_percent ?? 50 },
              { onSuccess: () => toast.success('Standard milestones generated') },
            )
          }
          disabled={generateStandard.isPending}
        >
          <Sparkles /> Generate standard milestones
        </Button>
      )}

      {!isLoading && milestones?.length === 0 && (
        <EmptyState icon={MilestoneIcon} title="No milestones yet" description="Generate the standard set or add one manually below." />
      )}

      <div className="flex flex-col gap-2">
        {milestones?.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <span className="min-w-32 flex-1 font-medium">{m.title}</span>
            <StatusBadge status={m.status} />
            <Money amount={m.amount} className="w-28 text-sm" />
            <DateText date={m.due_date} className="w-28 text-sm text-muted-foreground" />
            <Select value={m.status} onValueChange={(v) => updateMilestone.mutate({ id: m.id, status: v as MilestoneStatus })}>
              <SelectTrigger className="w-32" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon-sm" aria-label="Delete milestone" onClick={() => setDeleteId(m.id)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <Input placeholder="Milestone title" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 min-w-32" />
        <Input placeholder="Amount" aria-label="Milestone amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28" />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-36" />
        <Button size="sm" onClick={handleAdd} disabled={createMilestone.isPending}>
          <Plus /> Add
        </Button>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this milestone?"
        onConfirm={() => {
          if (deleteId) deleteMilestone.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
