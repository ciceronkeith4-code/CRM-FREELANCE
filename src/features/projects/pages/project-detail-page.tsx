import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useProject, useProjectTotals, useDeleteProject } from '@/features/projects/api'
import { ProjectForm } from '@/features/projects/components/project-form'
import { MilestonesTab } from '@/features/projects/components/milestones-tab'
import { ChangeRequestsTab } from '@/features/projects/components/change-requests-tab'
import { TimeLogsTab } from '@/features/projects/components/time-logs-tab'
import { AccessInfoTab } from '@/features/projects/components/access-info-tab'
import { ProjectInvoicesPaymentsTab } from '@/features/projects/components/project-invoices-payments-tab'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { FilesTab } from '@/components/shared/files-tab'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CopyButton } from '@/components/shared/copy-button'
import { safeHref } from '@/lib/url'
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

function UrlRow({ label, url }: { label: string; url: string | null }) {
  if (!url) return <InfoRow label={label} value={null} />
  const href = safeHref(url)
  return (
    <InfoRow
      label={label}
      value={
        <span className="flex min-w-0 items-center justify-end gap-1">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center justify-end gap-1 break-all hover:underline">
              {url} <ExternalLink className="size-3 shrink-0" />
            </a>
          ) : (
            <span className="break-all">{url}</span>
          )}
          <CopyButton value={url} label={label} />
        </span>
      }
    />
  )
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading } = useProject(id)
  const { data: totals } = useProjectTotals(id)
  const deleteProject = useDeleteProject()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) return <DetailSkeleton stats={8} />

  if (!project) {
    return <RecordNotFound label="Project" backTo="/projects" />
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => navigate('/projects')}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-xl font-semibold">{project.title}</h1>
          <p className="text-sm text-muted-foreground">{project.clients?.name}</p>
        </div>
        <StatusBadge status={project.status} />
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
            <p className="text-xs text-muted-foreground">Contract value</p>
            <Money amount={totals?.contract_value ?? project.base_price} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Balance</p>
            <Money amount={totals?.balance} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Payment status</p>
            {totals && <StatusBadge status={totals.payment_status} className="mt-1" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Deadline</p>
            {totals && <StatusBadge status={totals.deadline_status} className="mt-1" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Direct costs</p>
            <Money amount={totals?.direct_costs} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Profit</p>
            <Money amount={totals?.profit} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Hours logged</p>
            <p className="text-lg font-semibold">{totals?.hours_logged ?? 0}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Effective rate</p>
            <p className="text-lg font-semibold">
              {totals?.effective_hourly_rate != null ? <Money amount={totals.effective_hourly_rate} /> : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="change_requests">Change Requests</TabsTrigger>
          <TabsTrigger value="invoices_payments">Invoices & Payments</TabsTrigger>
          <TabsTrigger value="time_logs">Time Logs</TabsTrigger>
          <TabsTrigger value="access_info">Access Info</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="Type" value={project.project_type} />
              <InfoRow label="Pricing model" value={project.pricing_model} />
              {project.pricing_model === 'Hourly' && <InfoRow label="Hourly rate" value={<Money amount={project.hourly_rate} />} />}
              <InfoRow label="Estimated hours" value={project.estimated_hours} />
              <InfoRow label="Start date" value={<DateText date={project.start_date} />} />
              <InfoRow label="Deadline" value={<DateText date={project.deadline} />} />
              <InfoRow label="Completion date" value={<DateText date={project.completion_date} />} />
              <InfoRow label="Support/warranty until" value={<DateText date={project.warranty_end_date} />} />
              {project.description && (
                <div className="py-1.5">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tech & links</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <div className="flex flex-wrap gap-1.5 py-1.5">
                {project.tech_stack.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
              <UrlRow label="Live URL" url={project.live_url} />
              <UrlRow label="Staging URL" url={project.staging_url} />
              <UrlRow label="Repository" url={project.repository_url} />
              <InfoRow label="Hosting provider" value={project.hosting_provider} />
              <InfoRow label="Domain registrar" value={project.domain_registrar} />
              {project.notes && (
                <div className="py-1.5">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{project.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <MilestonesTab projectId={project.id} basePrice={project.base_price} />
        </TabsContent>
        <TabsContent value="change_requests">
          <ChangeRequestsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="invoices_payments">
          <ProjectInvoicesPaymentsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="time_logs">
          <TimeLogsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="access_info">
          <AccessInfoTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab entityType="project" entityId={project.id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline entityType="project" entityId={project.id} />
        </TabsContent>
      </Tabs>

      <ProjectForm open={formOpen} onOpenChange={setFormOpen} project={project} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this project?"
        description="Milestones, change requests, time logs, and access info will also be deleted. This cannot be undone."
        onConfirm={() =>
          deleteProject.mutate(project.id, {
            onSuccess: () => {
              toast.success('Project deleted')
              navigate('/projects')
            },
          })
        }
      />
    </div>
  )
}
