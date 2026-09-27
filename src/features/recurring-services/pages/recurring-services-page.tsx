import { useState } from 'react'
import { toast } from 'sonner'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Plus, RefreshCw, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { useRecurringServices, useMarkRenewed, useDeleteRecurringService, type RecurringServiceWithClient } from '@/features/recurring-services/api'
import { RecurringServiceForm } from '@/features/recurring-services/components/recurring-service-form'
import { useSettings } from '@/features/settings/api'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toastError } from '@/lib/errors'
import { formatMoney } from '@/lib/format'
import { useCurrency } from '@/hooks/use-currency'

export function RecurringServicesPage() {
  const { data: services, isLoading } = useRecurringServices()
  const { data: settings } = useSettings()
  const currency = useCurrency()
  const markRenewed = useMarkRenewed()
  const deleteService = useDeleteRecurringService()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringServiceWithClient | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [renewing, setRenewing] = useState<RecurringServiceWithClient | null>(null)

  const leadDays = settings?.renewal_reminder_days ?? 30

  const urgencyClass = (row: RecurringServiceWithClient) => {
    if (!row.next_renewal_date || row.status !== 'Active') return undefined
    const days = differenceInCalendarDays(parseISO(row.next_renewal_date), new Date())
    if (days < 0) return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/40'
    if (days <= leadDays) return 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
    return 'bg-emerald-50/50 dark:bg-emerald-950/10'
  }

  const columns: DataTableColumn<RecurringServiceWithClient>[] = [
    { key: 'client', header: 'Client', render: (s) => <span className="font-medium">{s.clients?.name}</span> },
    { key: 'type', header: 'Service', render: (s) => s.service_type },
    { key: 'provider', header: 'Provider', render: (s) => s.provider ?? '—' },
    { key: 'amount', header: 'Charged', render: (s) => <Money amount={s.amount_charged} /> },
    { key: 'cycle', header: 'Cycle', render: (s) => s.billing_cycle },
    { key: 'renewal', header: 'Next renewal', render: (s) => <DateText date={s.next_renewal_date} /> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex justify-end gap-1">
          {s.status === 'Active' && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Mark as renewed"
              aria-label="Mark as renewed"
              disabled={markRenewed.isPending}
              onClick={(e) => {
                e.stopPropagation()
                setRenewing(s)
              }}
            >
              <CheckCircle2 className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit service"
            onClick={(e) => {
              e.stopPropagation()
              setEditing(s)
              setFormOpen(true)
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete service"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteId(s.id)
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Recurring Services</h1>
          <p className="text-sm text-muted-foreground">Hosting, domains, and retainers you manage for clients.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus /> Add service
        </Button>
      </div>

      {!isLoading && (services?.length ?? 0) === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No recurring services yet"
          description="Track hosting, domains, and retainers so renewals never sneak up on you."
          actionLabel="Add service"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={services ?? []}
          isLoading={isLoading}
          getRowId={(s) => s.id}
          mobileTitle={(s) => `${s.clients?.name} — ${s.service_type}`}
          rowClassName={urgencyClass}
        />
      )}

      <RecurringServiceForm open={formOpen} onOpenChange={setFormOpen} service={editing} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this recurring service?"
        onConfirm={() => {
          if (deleteId) deleteService.mutate(deleteId)
          setDeleteId(null)
        }}
      />
      <ConfirmDialog
        open={!!renewing}
        onOpenChange={(o) => !o && setRenewing(null)}
        title="Mark as renewed?"
        description={
          renewing
            ? `Records a ${formatMoney(renewing.amount_charged, currency)} payment from ${renewing.clients?.name ?? 'the client'}` +
              (renewing.my_cost > 0 ? `, a ${formatMoney(renewing.my_cost, currency)} expense,` : '') +
              ` and moves the next renewal forward one ${renewing.billing_cycle.toLowerCase()} cycle.`
            : undefined
        }
        confirmLabel="Mark as renewed"
        destructive={false}
        onConfirm={() => {
          if (renewing) {
            markRenewed.mutate(renewing.id, {
              onSuccess: () => toast.success('Marked as renewed'),
              onError: (err) => toastError(err, 'Failed to renew'),
            })
          }
          setRenewing(null)
        }}
      />
    </div>
  )
}
