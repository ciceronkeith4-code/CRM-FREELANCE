import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import type { RecurringServiceRow } from '@/types/database'

export function ClientServicesTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['clients', clientId, 'recurring_services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_services')
        .select('*')
        .eq('client_id', clientId)
        .order('next_renewal_date')
      if (error) throw error
      return data as RecurringServiceRow[]
    },
  })

  const columns: DataTableColumn<RecurringServiceRow>[] = [
    { key: 'type', header: 'Service', render: (s) => <span className="font-medium">{s.service_type}</span> },
    { key: 'provider', header: 'Provider', render: (s) => s.provider ?? '—' },
    { key: 'amount', header: 'Amount', render: (s) => <Money amount={s.amount_charged} /> },
    { key: 'cycle', header: 'Cycle', render: (s) => s.billing_cycle },
    { key: 'renewal', header: 'Next renewal', render: (s) => <DateText date={s.next_renewal_date} /> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ]

  if (!isLoading && (data?.length ?? 0) === 0) {
    return <EmptyState icon={RefreshCw} title="No recurring services" description="Hosting, domains, and retainers for this client will show up here." />
  }

  return <DataTable columns={columns} data={data ?? []} isLoading={isLoading} getRowId={(s) => s.id} mobileTitle={(s) => s.service_type} />
}
