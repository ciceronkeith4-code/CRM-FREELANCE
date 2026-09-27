import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Target, LayoutGrid, List, AlertCircle, Search } from 'lucide-react'
import { isPast, isToday, parseISO } from 'date-fns'
import { prefetchLead, useLeads } from '@/features/leads/api'
import { LeadForm } from '@/features/leads/components/lead-form'
import { LeadKanbanBoard } from '@/features/leads/components/lead-kanban-board'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import type { LeadRow } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'

export function LeadsPage() {
  const { data: leads, isLoading } = useLeads()
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<LeadRow | undefined>(undefined)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const sorted = useMemo(() => leads ?? [], [leads])

  // Filtering is local, so there's nothing to debounce: defer it instead, keeping
  // keystrokes instant while the (animated) board/table catches up at low priority.
  const query = useDeferredValue(search)
  const isSearching = query.trim().length > 0
  const filtered = useMemo(() => {
    if (!isSearching) return sorted
    const q = query.trim().toLowerCase()
    return sorted.filter((l) => l.name.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q))
  }, [sorted, query, isSearching])

  const columns: DataTableColumn<LeadRow>[] = [
    { key: 'name', header: 'Name', render: (l) => <span className="font-medium">{l.name}</span> },
    { key: 'company', header: 'Company', render: (l) => l.company ?? '—' },
    { key: 'stage', header: 'Stage', render: (l) => <StatusBadge status={l.stage} /> },
    { key: 'value', header: 'Estimated value', render: (l) => <Money amount={l.estimated_value} /> },
    {
      key: 'followup',
      header: 'Next follow-up',
      render: (l) => {
        const overdue = !!l.next_follow_up_date && isPast(parseISO(l.next_follow_up_date)) && !isToday(parseISO(l.next_follow_up_date))
        return (
          <span className={cn('flex items-center gap-1', overdue && 'font-medium text-red-500')}>
            {overdue && <AlertCircle className="size-3.5" />}
            <DateText date={l.next_follow_up_date} />
          </span>
        )
      },
    },
    { key: 'source', header: 'Source', render: (l) => l.source ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">Track prospects from first contact to close.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
            >
              <LayoutGrid /> Board
            </Button>
            <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('table')}>
              <List /> Table
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditingLead(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> Add lead
          </Button>
        </div>
      </div>

      {!isLoading && sorted.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No leads yet"
          description="Add your first lead to start tracking your pipeline."
          actionLabel="Add lead"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads by name or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {isSearching && filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matching leads" description={`Nothing matches "${search}".`} />
          ) : view === 'kanban' ? (
            <LeadKanbanBoard leads={filtered} isSearching={isSearching} onCardClick={(lead) => navigate(`/leads/${lead.id}`)} />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              getRowId={(l) => l.id}
              mobileTitle={(l) => l.name}
              onRowClick={(l) => navigate(`/leads/${l.id}`)}
              onRowHover={(l) => prefetchLead(queryClient, l.id)}
            />
          )}
        </>
      )}

      <LeadForm open={formOpen} onOpenChange={setFormOpen} lead={editingLead} />
    </div>
  )
}
