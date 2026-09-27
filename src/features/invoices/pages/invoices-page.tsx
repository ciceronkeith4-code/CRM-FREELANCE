import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Receipt } from 'lucide-react'
import { prefetchInvoice, useInvoices, type InvoiceWithClient } from '@/features/invoices/api'
import { InvoiceForm } from '@/features/invoices/components/invoice-form'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQueryClient } from '@tanstack/react-query'

const STATUSES = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] as const

export function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const filtered = useMemo(() => {
    if (!invoices) return []
    if (statusFilter === 'all') return invoices
    return invoices.filter((i) => i.computed_status === statusFilter)
  }, [invoices, statusFilter])

  const columns: DataTableColumn<InvoiceWithClient>[] = [
    { key: 'number', header: 'Number', render: (i) => <span className="font-medium">{i.number}</span> },
    { key: 'client', header: 'Client', render: (i) => i.clients?.name ?? '—' },
    { key: 'project', header: 'Project', render: (i) => i.projects?.title ?? '—' },
    { key: 'due', header: 'Due', render: (i) => <DateText date={i.due_date} /> },
    { key: 'total', header: 'Total', render: (i) => <Money amount={i.total} /> },
    { key: 'balance', header: 'Balance', render: (i) => <Money amount={i.total - i.amount_paid} /> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.computed_status} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Bill clients and track what's outstanding.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> New invoice
        </Button>
      </div>

      {!isLoading && (invoices?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create an invoice, or pull one in from a project's milestones."
          actionLabel="New invoice"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            getRowId={(i) => i.id}
            mobileTitle={(i) => i.number ?? 'Invoice'}
            onRowClick={(i) => navigate(`/invoices/${i.id}`)}
            onRowHover={(i) => prefetchInvoice(queryClient, i.id)}
          />
        </>
      )}

      <InvoiceForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
