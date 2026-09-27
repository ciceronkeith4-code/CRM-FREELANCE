import { useMemo, useState } from 'react'
import { Plus, Wallet, Trash2 } from 'lucide-react'
import { usePayments, useDeletePayment, type PaymentWithRelations } from '@/features/payments/api'
import { PaymentForm } from '@/features/payments/components/payment-form'
import { useClients } from '@/features/clients/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const METHODS = ['GCash', 'Maya', 'Bank transfer', 'PayPal', 'Wise', 'Cash', 'Other']
const TYPES = ['Downpayment', 'Milestone', 'Full payment', 'Change request', 'Recurring service', 'License', 'Other']

export function PaymentsPage() {
  const { data: payments, isLoading } = usePayments()
  const { data: clients } = useClients()
  const deletePayment = useDeletePayment()
  const [clientFilter, setClientFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentWithRelations | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return (payments ?? []).filter((p) => {
      if (clientFilter !== 'all' && p.client_id !== clientFilter) return false
      if (methodFilter !== 'all' && p.method !== methodFilter) return false
      if (typeFilter !== 'all' && p.payment_type !== typeFilter) return false
      if (dateFrom && p.date_paid < dateFrom) return false
      if (dateTo && p.date_paid > dateTo) return false
      return true
    })
  }, [payments, clientFilter, methodFilter, typeFilter, dateFrom, dateTo])

  const total = filtered.reduce((sum, p) => sum + p.amount, 0)

  const columns: DataTableColumn<PaymentWithRelations>[] = [
    { key: 'date', header: 'Date', render: (p) => <DateText date={p.date_paid} /> },
    { key: 'client', header: 'Client', render: (p) => p.clients?.name ?? '—' },
    { key: 'project', header: 'Project', render: (p) => p.projects?.title ?? '—' },
    { key: 'invoice', header: 'Invoice', render: (p) => p.invoices?.number ?? '—' },
    { key: 'amount', header: 'Amount', render: (p) => <Money amount={p.amount} className="font-medium" /> },
    { key: 'method', header: 'Method', render: (p) => p.method ?? '—' },
    { key: 'type', header: 'Type', render: (p) => p.payment_type ?? '—' },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete payment"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteId(p.id)
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
          <h1 className="font-heading text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground">Every peso that's come in.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus /> Record payment
        </Button>
      </div>

      {!isLoading && (payments?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments yet"
          description="Record a payment to start tracking income."
          actionLabel="Record payment"
          onAction={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" placeholder="To" />
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
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
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
            <span className="text-sm text-muted-foreground">{filtered.length} payments</span>
            <Money amount={total} className="font-semibold" />
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            getRowId={(p) => p.id}
            mobileTitle={(p) => p.payment_type ?? 'Payment'}
            onRowClick={(p) => {
              setEditing(p)
              setFormOpen(true)
            }}
          />
        </>
      )}

      <PaymentForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(undefined)
        }}
        payment={editing}
      />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this payment?"
        description="This cannot be undone."
        onConfirm={() => {
          if (deleteId) deletePayment.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
