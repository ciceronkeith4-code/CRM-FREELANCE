import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { CopyButton } from '@/components/shared/copy-button'
import type { PaymentRow } from '@/types/database'

export function ClientPaymentsTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['clients', clientId, 'payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .order('date_paid', { ascending: false })
      if (error) throw error
      return data as PaymentRow[]
    },
  })

  const columns: DataTableColumn<PaymentRow>[] = [
    { key: 'date', header: 'Date', render: (p) => <DateText date={p.date_paid} /> },
    { key: 'amount', header: 'Amount', render: (p) => <Money amount={p.amount} className="font-medium" /> },
    { key: 'method', header: 'Method', render: (p) => p.method ?? '—' },
    { key: 'type', header: 'Type', render: (p) => p.payment_type ?? '—' },
    {
      key: 'reference',
      header: 'Reference',
      render: (p) =>
        p.reference_number ? (
          <span className="inline-flex items-center gap-1">
            {p.reference_number}
            <CopyButton value={p.reference_number} label="reference number" />
          </span>
        ) : (
          '—'
        ),
    },
  ]

  if (!isLoading && (data?.length ?? 0) === 0) {
    return <EmptyState icon={Wallet} title="No payments yet" description="Payments from this client will show up here." />
  }

  return <DataTable columns={columns} data={data ?? []} isLoading={isLoading} getRowId={(p) => p.id} mobileTitle={(p) => p.payment_type ?? 'Payment'} />
}
