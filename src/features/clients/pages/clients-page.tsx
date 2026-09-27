import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Search } from 'lucide-react'
import { prefetchClient, useClients } from '@/features/clients/api'
import { ClientForm } from '@/features/clients/components/client-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ClientRow } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'

const SOURCES = ['Referral', 'Facebook', 'Instagram', 'LinkedIn', 'Cold outreach', 'Walk-in', 'Website', 'Other']

export function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const c of clients ?? []) for (const t of c.tags) set.add(t)
    return Array.from(set).sort()
  }, [clients])

  // Local filter: deferred (not debounced) so typing stays instant while the list re-renders.
  const query = useDeferredValue(search)
  const filtered = useMemo(() => {
    if (!clients) return []
    const q = query.trim().toLowerCase()
    return clients.filter((c) => {
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false
      if (tagFilter !== 'all' && !c.tags.includes(tagFilter)) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    })
  }, [clients, query, sourceFilter, tagFilter])

  const columns: DataTableColumn<ClientRow>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'company', header: 'Company', render: (c) => c.company ?? '—' },
    { key: 'email', header: 'Email', render: (c) => c.email ?? '—' },
    { key: 'phone', header: 'Phone', render: (c) => c.phone ?? '—' },
    {
      key: 'tags',
      header: 'Tags',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">Everyone you've worked with.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> Add client
        </Button>
      </div>

      {!isLoading && (clients?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add a client, or convert a lead once it's won."
          actionLabel="Add client"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {allTags.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            getRowId={(c) => c.id}
            mobileTitle={(c) => c.name}
            onRowClick={(c) => navigate(`/clients/${c.id}`)}
            onRowHover={(c) => prefetchClient(queryClient, c.id)}
          />
        </>
      )}

      <ClientForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
