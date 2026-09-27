import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2, Printer, ArrowRightCircle } from 'lucide-react'
import { useQuotation, useDeleteQuotation, useConvertQuotationToProject } from '@/features/quotations/api'
import { QuotationForm } from '@/features/quotations/components/quotation-form'
import { PrintableDocument } from '@/components/shared/printable-document'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toastError } from '@/lib/errors'
import { RecordNotFound } from '@/components/shared/record-not-found'
import { DetailSkeleton } from '@/components/shared/skeletons'

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: quotation, isLoading } = useQuotation(id)
  const deleteQuotation = useDeleteQuotation()
  const convertToProject = useConvertQuotationToProject()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) return <DetailSkeleton stats={0} />

  if (!quotation) {
    return <RecordNotFound label="Quotation" backTo="/quotations" />
  }

  const billToName = quotation.clients?.name ?? quotation.leads?.name ?? '—'
  const billToDetails = quotation.clients
    ? [quotation.clients.email, quotation.clients.phone, quotation.clients.address]
    : [quotation.leads?.email, quotation.leads?.phone]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => navigate('/quotations')}>
          <ArrowLeft />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-heading text-xl font-semibold">{quotation.title}</h1>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print / Download
        </Button>
        {quotation.status === 'Accepted' && !quotation.project_id && (
          <Button
            variant="outline"
            disabled={convertToProject.isPending}
            onClick={() =>
              convertToProject.mutate(quotation, {
                onSuccess: (project) => {
                  toast.success('Converted to project')
                  navigate(`/projects/${project.id}`)
                },
                onError: (err) => toastError(err, 'Failed to convert'),
              })
            }
          >
            <ArrowRightCircle /> Convert to project
          </Button>
        )}
        <Button variant="outline" onClick={() => setFormOpen(true)}>
          <Pencil /> Edit
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 /> Delete
        </Button>
      </div>

      <PrintableDocument
        docLabel="Quotation"
        number={quotation.number}
        issueDate={quotation.issue_date}
        secondDateLabel="Valid until"
        secondDate={quotation.valid_until_date}
        billToName={billToName}
        billToDetails={billToDetails}
        lineItems={quotation.line_items ?? []}
        subtotal={quotation.subtotal}
        discountType={quotation.discount_type}
        discountValue={quotation.discount_value}
        total={quotation.total}
        notes={quotation.terms}
        statusNode={<StatusBadge status={quotation.status} />}
      />

      <QuotationForm open={formOpen} onOpenChange={setFormOpen} quotation={quotation} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this quotation?"
        onConfirm={() =>
          deleteQuotation.mutate(quotation.id, {
            onSuccess: () => {
              toast.success('Quotation deleted')
              navigate('/quotations')
            },
          })
        }
      />
    </div>
  )
}
