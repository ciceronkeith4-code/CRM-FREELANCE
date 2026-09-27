import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { prefetchQuotation, useQuotations } from '@/features/quotations/api'
import { QuotationForm } from '@/features/quotations/components/quotation-form'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { QuotationWithClient } from '@/features/quotations/api'
import { useQueryClient } from '@tanstack/react-query'

const STATUSES = ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'] as const

export function QuotationsPage() {
  const { data: quotations, isLoading } = useQuotations()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const filtered = useMemo(() => {
    if (!quotations) return []
    if (statusFilter === 'all') return quotations
    return quotations.filter((q) => q.status === statusFilter)
  }, [quotations, statusFilter])

  const columns: DataTableColumn<QuotationWithClient>[] = [
    { key: 'number', header: 'Number', render: (q) => <span className="font-medium">{q.number}</span> },
    { key: 'title', header: 'Title', render: (q) => q.title },
    { key: 'billTo', header: 'Bill to', render: (q) => q.clients?.name ?? q.leads?.name ?? '—' },
    { key: 'issue', header: 'Issued', render: (q) => <DateText date={q.issue_date} /> },
    { key: 'total', header: 'Total', render: (q) => <Money amount={q.total} /> },
    { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.status} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Quotations</h1>
          <p className="text-sm text-muted-foreground">Send proposals and convert accepted ones into projects.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> New quotation
        </Button>
      </div>

      {!isLoading && (quotations?.length ?? 0) === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations yet"
          description="Create your first quotation to send to a client or lead."
          actionLabel="New quotation"
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
            getRowId={(q) => q.id}
            mobileTitle={(q) => q.number ?? q.title}
            onRowClick={(q) => navigate(`/quotations/${q.id}`)}
            onRowHover={(q) => prefetchQuotation(queryClient, q.id)}
          />
        </>
      )}

      <QuotationForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
