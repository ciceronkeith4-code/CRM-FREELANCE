import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, LayoutGrid, List } from 'lucide-react'
import { prefetchProject, useProjects, type ProjectWithClientAndTotals } from '@/features/projects/api'
import { ProjectForm } from '@/features/projects/components/project-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatePresence, motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import { CardGridSkeleton } from '@/components/shared/skeletons'
import { listItem } from '@/lib/motion'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MotionCard = motion.create(Card)

const STATUSES = ['Planning', 'In Progress', 'On Hold', 'For Review', 'Completed', 'Cancelled']
const TYPES = ['Website', 'Website redesign', 'Web app/System', 'E-commerce', 'Mobile app', 'Maintenance', 'Other']
const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Fully Paid']

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const filtered = useMemo(() => {
    return (projects ?? []).filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (typeFilter !== 'all' && p.project_type !== typeFilter) return false
      if (paymentFilter !== 'all' && p.totals?.payment_status !== paymentFilter) return false
      return true
    })
  }, [projects, statusFilter, typeFilter, paymentFilter])

  const columns: DataTableColumn<ProjectWithClientAndTotals>[] = [
    { key: 'title', header: 'Project', render: (p) => <span className="font-medium">{p.title}</span> },
    { key: 'client', header: 'Client', render: (p) => p.clients?.name ?? '—' },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'deadline', header: 'Deadline', render: (p) => <DateText date={p.deadline} /> },
    { key: 'contract', header: 'Contract value', render: (p) => <Money amount={p.totals?.contract_value ?? p.base_price} /> },
    { key: 'balance', header: 'Balance', render: (p) => <Money amount={p.totals?.balance} /> },
    { key: 'payment', header: 'Payment', render: (p) => (p.totals ? <StatusBadge status={p.totals.payment_status} /> : '—') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Everything you're building right now and what's owed.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button variant={view === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('cards')}>
              <LayoutGrid /> Cards
            </Button>
            <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('table')}>
              <List /> Table
            </Button>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> New project
          </Button>
        </div>
      </div>

      {!isLoading && (projects?.length ?? 0) === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project directly, or convert an accepted quotation."
          actionLabel="New project"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payment status</SelectItem>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {view === 'cards' && isLoading ? (
            <CardGridSkeleton />
          ) : view === 'cards' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence initial>
                {filtered.map((p, index) => (
                  <MotionCard
                    key={p.id}
                    layout={filtered.length <= 60 ? 'position' : false}
                    variants={listItem}
                    custom={index}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    tabIndex={0}
                    className="cursor-pointer outline-none transition-colors duration-150 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted/60"
                    onClick={() => navigate(`/projects/${p.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${p.id}`)}
                    onMouseEnter={() => prefetchProject(queryClient, p.id)}
                  >
                    <CardContent className="flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{p.title}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <span className="text-sm text-muted-foreground">{p.clients?.name}</span>
                      <div className="flex items-center justify-between text-sm">
                        <Money amount={p.totals?.contract_value ?? p.base_price} className="font-medium" />
                        {p.totals && <StatusBadge status={p.totals.payment_status} />}
                      </div>
                      {p.deadline && (
                        <span className="text-xs text-muted-foreground">
                          Deadline <DateText date={p.deadline} />
                        </span>
                      )}
                    </CardContent>
                  </MotionCard>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              getRowId={(p) => p.id}
              mobileTitle={(p) => p.title}
              onRowClick={(p) => navigate(`/projects/${p.id}`)}
              onRowHover={(p) => prefetchProject(queryClient, p.id)}
            />
          )}
        </>
      )}

      <ProjectForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
