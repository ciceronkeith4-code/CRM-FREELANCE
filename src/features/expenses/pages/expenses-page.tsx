import { useMemo, useState } from 'react'
import { Plus, ReceiptText, Trash2 } from 'lucide-react'
import { useExpenses, useDeleteExpense, type ExpenseWithRelations } from '@/features/expenses/api'
import { ExpenseForm } from '@/features/expenses/components/expense-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const CATEGORIES = ['Hosting', 'Domain', 'Software/Subscription', 'Hardware', 'Internet', 'Transportation', 'Outsourcing', 'Other']

export function ExpensesPage() {
  const { data: expenses, isLoading } = useExpenses()
  const deleteExpense = useDeleteExpense()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseWithRelations | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return (expenses ?? []).filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo && e.date > dateTo) return false
      return true
    })
  }, [expenses, categoryFilter, dateFrom, dateTo])

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)

  const columns: DataTableColumn<ExpenseWithRelations>[] = [
    { key: 'date', header: 'Date', render: (e) => <DateText date={e.date} /> },
    { key: 'category', header: 'Category', render: (e) => e.category },
    { key: 'vendor', header: 'Vendor', render: (e) => e.vendor ?? '—' },
    { key: 'client', header: 'Client', render: (e) => e.clients?.name ?? '—' },
    { key: 'project', header: 'Project', render: (e) => e.projects?.title ?? '—' },
    { key: 'amount', header: 'Amount', render: (e) => <Money amount={e.amount} className="font-medium" /> },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete expense"
          onClick={(ev) => {
            ev.stopPropagation()
            setDeleteId(e.id)
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">What it costs to run the business.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus /> Add expense
        </Button>
      </div>

      {!isLoading && (expenses?.length ?? 0) === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No expenses yet"
          description="Track hosting, domains, software, and other costs."
          actionLabel="Add expense"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
            <span className="text-sm text-muted-foreground">{filtered.length} expenses</span>
            <Money amount={total} className="font-semibold" />
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            getRowId={(e) => e.id}
            mobileTitle={(e) => e.category}
            onRowClick={(e) => {
              setEditing(e)
              setFormOpen(true)
            }}
          />
        </>
      )}

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} expense={editing} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this expense?"
        onConfirm={() => {
          if (deleteId) deleteExpense.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
