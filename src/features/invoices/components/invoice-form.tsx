import { useEffect } from 'react'
import { useForm, useWatch, useFieldArray, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { Reveal } from '@/components/shared/reveal'
import { SelectField } from '@/components/shared/rhf-fields'
import {
  LineItemsEditor,
  normalizeLineItems,
  subtotalOf,
  useLineItemsSubtotal,
  type LineItem,
} from '@/components/shared/line-items-editor'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useProjects } from '@/features/projects/api'
import { useCreateInvoice, useUpdateInvoice, useUnbilledMilestones, useUnbilledChangeRequests } from '@/features/invoices/api'
import { computeDiscountAmount, computeTotal } from '@/lib/pricing'
import { formatMoney, todayISO } from '@/lib/format'
import { toastError } from '@/lib/errors'
import { useCurrency } from '@/hooks/use-currency'
import type { InvoiceRow } from '@/types/database'

// Partially Paid / Paid / Overdue are derived automatically from payments and the
// due date, so only the manual states can be chosen here.
const EDITABLE_STATUSES = ['Draft', 'Sent', 'Cancelled'] as const
type EditableStatus = (typeof EDITABLE_STATUSES)[number]

interface FormValues {
  client_id: string
  project_id: string
  issue_date: string
  due_date: string
  notes: string
  status: EditableStatus
  discount_type: 'amount' | 'percent' | null
  discount_value: number
  line_items: LineItem[]
}

const BLANK_LINE: LineItem = { description: '', quantity: 1, unit_price: 0, line_total: 0 }

function toEditableStatus(status: InvoiceRow['status']): EditableStatus {
  return status === 'Draft' || status === 'Cancelled' ? status : 'Sent'
}

export function InvoiceForm({
  open,
  onOpenChange,
  invoice,
  defaultProjectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: InvoiceRow & { line_items?: LineItem[] }
  defaultProjectId?: string
}) {
  const { data: clients } = useClients()
  const { data: projects } = useProjects()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const currency = useCurrency()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      status: 'Draft',
      issue_date: todayISO(),
      discount_type: null,
      discount_value: 0,
      line_items: [BLANK_LINE],
    },
  })

  const clientId = useWatch({ control, name: 'client_id' })
  const projectId = useWatch({ control, name: 'project_id' })
  const lineItems = useWatch({ control, name: 'line_items' })
  const subtotal = useLineItemsSubtotal(control, 'line_items')
  const discountType = useWatch({ control, name: 'discount_type' })
  const discountValue = useWatch({ control, name: 'discount_value' })
  const { append } = useFieldArray({ control, name: 'line_items' })

  const { data: unbilledMilestones } = useUnbilledMilestones(projectId)
  const { data: unbilledChangeRequests } = useUnbilledChangeRequests(projectId)

  // Hide anything already on this invoice so the same item can't be added twice.
  const usedMilestones = new Set((lineItems ?? []).map((i) => i?.source_milestone_id).filter(Boolean))
  const usedChangeRequests = new Set((lineItems ?? []).map((i) => i?.source_change_request_id).filter(Boolean))
  const availableMilestones = (unbilledMilestones ?? []).filter((m) => !usedMilestones.has(m.id))
  const availableChangeRequests = (unbilledChangeRequests ?? []).filter((cr) => !usedChangeRequests.has(cr.id))

  const clientProjects = (projects ?? []).filter((p) => p.client_id === clientId)

  useEffect(() => {
    if (open) {
      reset(
        invoice
          ? {
              client_id: invoice.client_id,
              project_id: invoice.project_id ?? '',
              issue_date: invoice.issue_date,
              due_date: invoice.due_date ?? '',
              notes: invoice.notes ?? '',
              status: toEditableStatus(invoice.status),
              discount_type: invoice.discount_type,
              discount_value: invoice.discount_value,
              line_items: invoice.line_items?.length ? invoice.line_items : [BLANK_LINE],
            }
          : {
              client_id: '',
              project_id: defaultProjectId ?? '',
              status: 'Draft',
              issue_date: todayISO(),
              due_date: '',
              notes: '',
              discount_type: null,
              discount_value: 0,
              line_items: [BLANK_LINE],
            },
      )
    }
  }, [open, invoice, defaultProjectId, reset])

  // If a default project is provided, infer its client.
  useEffect(() => {
    if (open && !invoice && defaultProjectId && projects) {
      const proj = projects.find((p) => p.id === defaultProjectId)
      if (proj) setValue('client_id', proj.client_id)
    }
  }, [open, invoice, defaultProjectId, projects, setValue])

  const onSubmit = async (values: FormValues) => {
    const items = normalizeLineItems(values.line_items)
    const lineSubtotal = subtotalOf(items)
    const payload = {
      client_id: values.client_id,
      project_id: values.project_id || null,
      issue_date: values.issue_date,
      due_date: values.due_date || null,
      notes: values.notes || null,
      status: values.status,
      discount_type: values.discount_type,
      discount_value: Number(values.discount_value) || 0,
      subtotal: lineSubtotal,
      total: computeTotal(lineSubtotal, values.discount_type, Number(values.discount_value) || 0),
      line_items: items,
    }
    try {
      if (invoice) {
        await updateInvoice.mutateAsync({ id: invoice.id, ...payload })
        toast.success('Invoice updated')
      } else {
        await createInvoice.mutateAsync(payload)
        toast.success('Invoice created')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save invoice')
    }
  }

  const discountAmount = computeDiscountAmount(subtotal, discountType, Number(discountValue) || 0)

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={invoice ? 'Edit invoice' : 'New invoice'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createInvoice.isPending || updateInvoice.isPending}
      dirty={isDirty}
    >
      <FormField label="Client" htmlFor="client_id" required error={errors.client_id?.message}>
        <Controller
          control={control}
          name="client_id"
          rules={{ required: 'Select a client' }}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v)
                setValue('project_id', '')
              }}
            >
              <SelectTrigger id="client_id" className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <Reveal when={!!clientId}>
        <FormField label="Project (optional)" htmlFor="project_id">
          <Controller
            control={control}
            name="project_id"
            render={({ field }) => (
              <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                <SelectTrigger id="project_id" className="w-full">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {clientProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </Reveal>

      <Reveal when={!!projectId && (availableMilestones.length > 0 || availableChangeRequests.length > 0)}>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Add unbilled items from this project:</span>
          <div className="flex flex-wrap gap-2">
            {availableMilestones.map((m) => (
              <Button
                key={m.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ description: `Milestone: ${m.title}`, quantity: 1, unit_price: m.amount, line_total: m.amount, source_milestone_id: m.id })
                }
              >
                <Download /> {m.title}
              </Button>
            ))}
            {availableChangeRequests.map((cr) => (
              <Button
                key={cr.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: `Change request: ${cr.title}`,
                    quantity: 1,
                    unit_price: cr.extra_charge,
                    line_total: cr.extra_charge,
                    source_change_request_id: cr.id,
                  })
                }
              >
                <Download /> {cr.title}
              </Button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Issue date" htmlFor="issue_date" required error={errors.issue_date?.message}>
          <Input id="issue_date" type="date" {...register('issue_date', { required: 'Issue date is required' })} />
        </FormField>
        <FormField label="Due date" htmlFor="due_date" error={errors.due_date?.message}>
          <Input
            id="due_date"
            type="date"
            {...register('due_date', {
              validate: (v, all) => !v || !all.issue_date || v >= all.issue_date || 'Must be on or after the issue date',
            })}
          />
        </FormField>
      </div>

      <FormField label="Line items">
        <LineItemsEditor control={control} name="line_items" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Discount type" htmlFor="discount_type">
          <SelectField control={control} name="discount_type" options={['amount', 'percent']} allowClear placeholder="No discount" />
        </FormField>
        <FormField label="Discount value" htmlFor="discount_value" error={errors.discount_value?.message}>
          <Input
            id="discount_value"
            type="number"
            min="0"
            step="0.01"
            {...register('discount_value', {
              valueAsNumber: true,
              validate: (v, all) => {
                const n = Number.isNaN(v) ? 0 : v
                if (n < 0) return 'Cannot be negative'
                if (all.discount_type === 'percent' && n > 100) return 'Percent cannot exceed 100'
                return true
              },
            })}
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(subtotal, currency)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>−{formatMoney(discountAmount, currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatMoney(computeTotal(subtotal, discountType, Number(discountValue) || 0), currency)}</span>
        </div>
      </div>

      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={2} {...register('notes')} />
      </FormField>

      <FormField
        label="Status"
        htmlFor="status"
        description="Partially Paid, Paid, and Overdue are set automatically from payments and the due date."
      >
        <SelectField control={control} name="status" options={EDITABLE_STATUSES} />
      </FormField>
    </FormSheet>
  )
}
