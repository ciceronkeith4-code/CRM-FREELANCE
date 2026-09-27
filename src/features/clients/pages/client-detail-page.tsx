import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useClient, useClientTotals, useDeleteClient } from '@/features/clients/api'
import { ClientForm } from '@/features/clients/components/client-form'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { FilesTab } from '@/components/shared/files-tab'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ClientProjectsTab } from '@/features/clients/components/client-projects-tab'
import { ClientInvoicesTab } from '@/features/clients/components/client-invoices-tab'
import { ClientPaymentsTab } from '@/features/clients/components/client-payments-tab'
import { ClientServicesTab } from '@/features/clients/components/client-services-tab'
import { ClientLicensesTab } from '@/features/clients/components/client-licenses-tab'
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

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id)
  const { data: totals } = useClientTotals(id)
  const deleteClient = useDeleteClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) return <DetailSkeleton stats={4} />

  if (!client) {
    return <RecordNotFound label="Client" backTo="/clients" />
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => navigate('/clients')}>
          <ArrowLeft />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-heading text-xl font-semibold">{client.name}</h1>
        <Button variant="outline" onClick={() => setFormOpen(true)}>
          <Pencil /> Edit
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Lifetime value</p>
            <Money amount={totals?.lifetime_value} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
            <Money amount={totals?.outstanding_balance} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Projects</p>
            <p className="text-lg font-semibold">{totals?.project_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Active services</p>
            <p className="text-lg font-semibold">{totals?.active_recurring_services ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client info</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="Company" value={client.company} />
              <InfoRow label="Business type" value={client.business_type} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Phone" value={client.phone} />
              <InfoRow label="Preferred contact" value={client.preferred_contact} />
              <InfoRow label="Social / profile" value={client.social_link} />
              <InfoRow label="Address" value={client.address} />
              <InfoRow label="Source" value={client.source} />
              <InfoRow label="Created" value={<DateText date={client.created_at} />} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags & notes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{client.notes || 'No notes yet.'}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <ClientProjectsTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="invoices">
          <ClientInvoicesTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="payments">
          <ClientPaymentsTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="services">
          <ClientServicesTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="licenses">
          <ClientLicensesTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab entityType="client" entityId={client.id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline entityType="client" entityId={client.id} />
        </TabsContent>
      </Tabs>

      <ClientForm open={formOpen} onOpenChange={setFormOpen} client={client} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this client?"
        description="Related projects, invoices, payments, recurring services, and licenses will also be deleted. This cannot be undone."
        onConfirm={() =>
          deleteClient.mutate(client.id, {
            onSuccess: () => {
              toast.success('Client deleted')
              navigate('/clients')
            },
          })
        }
      />
    </div>
  )
}
