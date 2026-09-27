import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2, UserCheck } from 'lucide-react'
import { useLead, useDeleteLead, useConvertLeadToClient } from '@/features/leads/api'
import { LeadForm } from '@/features/leads/components/lead-form'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toastError } from '@/lib/errors'
import { RecordNotFound } from '@/components/shared/record-not-found'
import { DetailSkeleton } from '@/components/shared/skeletons'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: lead, isLoading } = useLead(id)
  const deleteLead = useDeleteLead()
  const convertLead = useConvertLeadToClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) return <DetailSkeleton stats={0} />

  if (!lead) {
    return <RecordNotFound label="Lead" backTo="/leads" />
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => navigate('/leads')}>
          <ArrowLeft />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-heading text-xl font-semibold">{lead.name}</h1>
        <StatusBadge status={lead.stage} />
      </div>

      <div className="flex flex-wrap gap-2">
        {lead.stage !== 'Won' && (
          <Button
            variant="outline"
            onClick={() =>
              convertLead.mutate(lead, {
                onSuccess: (client) => {
                  toast.success('Converted to client')
                  navigate(`/clients/${client.id}`)
                },
                onError: (err) => toastError(err, 'Failed to convert'),
              })
            }
            disabled={convertLead.isPending}
          >
            <UserCheck /> Convert to client
          </Button>
        )}
        <Button variant="outline" onClick={() => setFormOpen(true)}>
          <Pencil /> Edit
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead info</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow label="Company" value={lead.company} />
            <InfoRow label="Business type" value={lead.business_type} />
            <InfoRow label="Email" value={lead.email} />
            <InfoRow label="Phone" value={lead.phone} />
            <InfoRow label="Preferred contact" value={lead.preferred_contact} />
            <InfoRow label="Social / profile" value={lead.social_link} />
            <InfoRow label="Source" value={lead.source} />
            <InfoRow label="Service interested in" value={lead.service_interested_in} />
            <InfoRow label="Estimated value" value={<Money amount={lead.estimated_value} />} />
            <InfoRow label="Next follow-up" value={<DateText date={lead.next_follow_up_date} />} />
            {lead.stage === 'Lost' && <InfoRow label="Lost reason" value={lead.lost_reason} />}
            <InfoRow label="Created" value={<DateText date={lead.created_at} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{lead.notes || 'No notes yet.'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline entityType="lead" entityId={lead.id} />
        </CardContent>
      </Card>

      <LeadForm open={formOpen} onOpenChange={setFormOpen} lead={lead} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this lead?"
        description="This cannot be undone."
        onConfirm={() =>
          deleteLead.mutate(lead.id, {
            onSuccess: () => {
              toast.success('Lead deleted')
              navigate('/leads')
            },
          })
        }
      />
    </div>
  )
}
