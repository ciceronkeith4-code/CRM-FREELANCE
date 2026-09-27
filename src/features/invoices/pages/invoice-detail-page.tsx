import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2, Printer, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useInvoice, useDeleteInvoice } from '@/features/invoices/api'
import { InvoiceForm } from '@/features/invoices/components/invoice-form'
import { PaymentForm } from '@/features/payments/components/payment-form'
import { PrintableDocument } from '@/components/shared/printable-document'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CopyButton } from '@/components/shared/copy-button'
import type { PaymentRow } from '@/types/database'
import { RecordNotFound } from '@/components/shared/record-not-found'
import { DetailSkeleton } from '@/components/shared/skeletons'

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: invoice, isLoading } = useInvoice(id)
  const deleteInvoice = useDeleteInvoice()
  const [formOpen, setFormOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: payments } = useQuery({
    queryKey: ['invoices', id, 'payments'],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*').eq('invoice_id', id as string).order('date_paid')
      if (error) throw error
      return data as PaymentRow[]
    },
  })

  if (isLoading) return <DetailSkeleton stats={0} />

  if (!invoice) {
    return <RecordNotFound label="Invoice" backTo="/invoices" />
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => navigate('/invoices')}>
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <h1 className="min-w-0 truncate font-heading text-xl font-semibold">{invoice.number}</h1>
          {invoice.number && <CopyButton value={invoice.number} label="invoice number" />}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print / Download
        </Button>
        <Button variant="outline" onClick={() => setPaymentOpen(true)}>
          <Plus /> Record payment
        </Button>
        <Button variant="outline" onClick={() => setFormOpen(true)}>
          <Pencil /> Edit
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 /> Delete
        </Button>
      </div>

      <PrintableDocument
        docLabel="Invoice"
        number={invoice.number}
        issueDate={invoice.issue_date}
        secondDateLabel="Due date"
        secondDate={invoice.due_date}
        billToName={invoice.clients?.name ?? '—'}
        billToDetails={[invoice.clients?.email, invoice.clients?.phone, invoice.clients?.address]}
        lineItems={invoice.line_items ?? []}
        subtotal={invoice.subtotal}
        discountType={invoice.discount_type}
        discountValue={invoice.discount_value}
        total={invoice.total}
        notes={invoice.notes}
        statusNode={<StatusBadge status={invoice.computed_status} />}
      />

      {(payments?.length ?? 0) > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {payments?.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <DateText date={p.date_paid} className="text-muted-foreground" />
                <span>{p.method}</span>
                <Money amount={p.amount} className="font-medium" />
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
              <span>Balance</span>
              <Money amount={invoice.total - invoice.amount_paid} />
            </div>
          </CardContent>
        </Card>
      )}

      <InvoiceForm open={formOpen} onOpenChange={setFormOpen} invoice={invoice} />
      <PaymentForm
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        defaultInvoiceId={invoice.id}
        defaultClientId={invoice.client_id}
        defaultProjectId={invoice.project_id ?? undefined}
        defaultAmount={Math.max(0, Math.round((invoice.total - invoice.amount_paid) * 100) / 100)}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this invoice?"
        onConfirm={() =>
          deleteInvoice.mutate(invoice.id, {
            onSuccess: () => {
              toast.success('Invoice deleted')
              navigate('/invoices')
            },
          })
        }
      />
    </div>
  )
}
