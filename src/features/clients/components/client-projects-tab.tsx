import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import type { ProjectComputedRow, ProjectRow } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchProject } from '@/features/projects/api'

type Row = ProjectRow & { totals?: ProjectComputedRow }

export function ClientProjectsTab({ clientId }: { clientId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['clients', clientId, 'projects'],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const { data: totals, error: totalsError } = await supabase
        .from('view_project_computed')
        .select('*')
        .in('project_id', projects.map((p) => p.id).length ? projects.map((p) => p.id) : ['00000000-0000-0000-0000-000000000000'])
      if (totalsError) throw totalsError
      const totalsMap = new Map((totals ?? []).map((t) => [t.project_id, t]))
      return projects.map((p) => ({ ...p, totals: totalsMap.get(p.id) })) as Row[]
    },
  })

  const columns: DataTableColumn<Row>[] = [
    { key: 'title', header: 'Project', render: (p) => <span className="font-medium">{p.title}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'contract', header: 'Contract value', render: (p) => <Money amount={p.totals?.contract_value ?? p.base_price} /> },
    { key: 'balance', header: 'Balance', render: (p) => <Money amount={p.totals?.balance} /> },
    { key: 'payment', header: 'Payment', render: (p) => (p.totals ? <StatusBadge status={p.totals.payment_status} /> : '—') },
  ]

  if (!isLoading && (data?.length ?? 0) === 0) {
    return <EmptyState icon={FolderKanban} title="No projects yet" description="Projects for this client will show up here." />
  }

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      getRowId={(p) => p.id}
      mobileTitle={(p) => p.title}
      onRowClick={(p) => navigate(`/projects/${p.id}`)}
      onRowHover={(p) => prefetchProject(queryClient, p.id)}
    />
  )
}
