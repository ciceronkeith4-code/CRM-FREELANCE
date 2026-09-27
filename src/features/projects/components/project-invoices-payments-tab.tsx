import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Receipt, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import type { InvoiceComputedRow, PaymentRow } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchInvoice } from '@/features/invoices/api'

export function ProjectInvoicesPaymentsTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['projects', projectId, 'invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_invoices_computed')
        .select('*')
        .eq('project_id', projectId)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data as InvoiceComputedRow[]
    },
  })

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['projects', projectId, 'payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', projectId)
        .order('date_paid', { ascending: false })
      if (error) throw error
      return data as PaymentRow[]
    },
  })

  const invoiceColumns: DataTableColumn<InvoiceComputedRow>[] = [
    { key: 'number', header: 'Invoice #', render: (i) => <span className="font-medium">{i.number}</span> },
    { key: 'issue', header: 'Issued', render: (i) => <DateText date={i.issue_date} /> },
    { key: 'total', header: 'Total', render: (i) => <Money amount={i.total} /> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.computed_status} /> },
  ]

  const paymentColumns: DataTableColumn<PaymentRow>[] = [
    { key: 'date', header: 'Date', render: (p) => <DateText date={p.date_paid} /> },
    { key: 'amount', header: 'Amount', render: (p) => <Money amount={p.amount} className="font-medium" /> },
    { key: 'method', header: 'Method', render: (p) => p.method ?? '—' },
    { key: 'type', header: 'Type', render: (p) => p.payment_type ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Invoices</h3>
        {!invoicesLoading && (invoices?.length ?? 0) === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" />
        ) : (
          <DataTable
            columns={invoiceColumns}
            data={invoices ?? []}
            isLoading={invoicesLoading}
            getRowId={(i) => i.id}
            mobileTitle={(i) => i.number ?? 'Invoice'}
            onRowClick={(i) => navigate(`/invoices/${i.id}`)}
            onRowHover={(i) => prefetchInvoice(queryClient, i.id)}
          />
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Payments</h3>
        {!paymentsLoading && (payments?.length ?? 0) === 0 ? (
          <EmptyState icon={Wallet} title="No payments yet" />
        ) : (
          <DataTable
            columns={paymentColumns}
            data={payments ?? []}
            isLoading={paymentsLoading}
            getRowId={(p) => p.id}
            mobileTitle={(p) => p.payment_type ?? 'Payment'}
          />
        )}
      </div>
    </div>
  )
}
