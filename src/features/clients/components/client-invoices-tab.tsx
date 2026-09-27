import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import type { InvoiceComputedRow } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchInvoice } from '@/features/invoices/api'

export function ClientInvoicesTab({ clientId }: { clientId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['clients', clientId, 'invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_invoices_computed')
        .select('*')
        .eq('client_id', clientId)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data as InvoiceComputedRow[]
    },
  })

  const columns: DataTableColumn<InvoiceComputedRow>[] = [
    { key: 'number', header: 'Invoice #', render: (i) => <span className="font-medium">{i.number}</span> },
    { key: 'issue', header: 'Issued', render: (i) => <DateText date={i.issue_date} /> },
    { key: 'due', header: 'Due', render: (i) => <DateText date={i.due_date} /> },
    { key: 'total', header: 'Total', render: (i) => <Money amount={i.total} /> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.computed_status} /> },
  ]

  if (!isLoading && (data?.length ?? 0) === 0) {
    return <EmptyState icon={Receipt} title="No invoices yet" description="Invoices for this client will show up here." />
  }

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      getRowId={(i) => i.id}
      mobileTitle={(i) => i.number ?? 'Invoice'}
      onRowClick={(i) => navigate(`/invoices/${i.id}`)}
      onRowHover={(i) => prefetchInvoice(queryClient, i.id)}
    />
  )
}
