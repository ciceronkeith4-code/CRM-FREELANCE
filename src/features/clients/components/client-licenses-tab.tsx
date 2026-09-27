import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import type { LicenseRow } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchProduct } from '@/features/products-licenses/api'

type Row = LicenseRow & { products: { name: string } | null }

export function ClientLicensesTab({ clientId }: { clientId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['clients', clientId, 'licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licenses')
        .select('*, products(name)')
        .eq('client_id', clientId)
        .order('purchase_date', { ascending: false })
      if (error) throw error
      return data as unknown as Row[]
    },
  })

  const columns: DataTableColumn<Row>[] = [
    { key: 'product', header: 'Product', render: (l) => <span className="font-medium">{l.products?.name ?? '—'}</span> },
    { key: 'purchase', header: 'Purchased', render: (l) => <DateText date={l.purchase_date} /> },
    { key: 'amount', header: 'Amount paid', render: (l) => <Money amount={l.amount_paid} /> },
    { key: 'support', header: 'Support until', render: (l) => <DateText date={l.support_until_date} /> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
  ]

  if (!isLoading && (data?.length ?? 0) === 0) {
    return <EmptyState icon={Package} title="No licenses yet" description="Product licenses sold to this client will show up here." />
  }

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      getRowId={(l) => l.id}
      mobileTitle={(l) => l.products?.name ?? 'License'}
      onRowClick={(l) => navigate(`/products/${l.product_id}`)}
      onRowHover={(l) => prefetchProduct(queryClient, l.product_id)}
    />
  )
}
