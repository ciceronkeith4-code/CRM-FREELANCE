import { useEffect } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useLeads } from '@/features/leads/api'
import { useCreateQuotation, useUpdateQuotation } from '@/features/quotations/api'
import { computeDiscountAmount, computeTotal } from '@/lib/pricing'
import { formatMoney, todayISO } from '@/lib/format'
import { useCurrency } from '@/hooks/use-currency'
import type { QuotationRow } from '@/types/database'
import { toastError } from '@/lib/errors'

const STATUSES = ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'] as const

interface FormValues {
  billTo: string
  title: string
  issue_date: string
  valid_until_date: string
  terms: string
  status: (typeof STATUSES)[number]
  discount_type: 'amount' | 'percent' | null
  discount_value: number
  line_items: LineItem[]
}

export function QuotationForm({
  open,
  onOpenChange,
  quotation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation?: QuotationRow & { line_items?: LineItem[] }
}) {
  const { data: clients } = useClients()
  const { data: leads } = useLeads()
  const createQuotation = useCreateQuotation()
  const updateQuotation = useUpdateQuotation()
  const currency = useCurrency()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      billTo: '',
      status: 'Draft',
      issue_date: todayISO(),
      discount_type: null,
      discount_value: 0,
      line_items: [{ description: '', quantity: 1, unit_price: 0, line_total: 0 }],
    },
  })

  const subtotal = useLineItemsSubtotal(control, 'line_items')
  const discountType = useWatch({ control, name: 'discount_type' })
  const discountValue = useWatch({ control, name: 'discount_value' })

  useEffect(() => {
    if (open) {
      reset(
        quotation
          ? {
              billTo: quotation.client_id ? `client:${quotation.client_id}` : quotation.lead_id ? `lead:${quotation.lead_id}` : '',
              title: quotation.title,
              issue_date: quotation.issue_date,
              valid_until_date: quotation.valid_until_date ?? '',
              terms: quotation.terms ?? '',
              status: quotation.status,
              discount_type: quotation.discount_type,
              discount_value: quotation.discount_value,
              line_items: quotation.line_items?.length
                ? quotation.line_items
                : [{ description: '', quantity: 1, unit_price: 0, line_total: 0 }],
            }
          : {
              billTo: '',
              title: '',
              status: 'Draft',
              issue_date: todayISO(),
              valid_until_date: '',
              terms: '',
              discount_type: null,
              discount_value: 0,
              line_items: [{ description: '', quantity: 1, unit_price: 0, line_total: 0 }],
            },
      )
    }
  }, [open, quotation, reset])

  const onSubmit = async (values: FormValues) => {
    const [type, id] = values.billTo.split(':')
    const lineItems = normalizeLineItems(values.line_items)
    const lineSubtotal = subtotalOf(lineItems)
    const total = computeTotal(lineSubtotal, values.discount_type, Number(values.discount_value) || 0)
    const payload = {
      client_id: type === 'client' ? id : null,
      lead_id: type === 'lead' ? id : null,
      title: values.title,
      issue_date: values.issue_date,
      valid_until_date: values.valid_until_date || null,
      terms: values.terms || null,
      status: values.status,
      discount_type: values.discount_type,
      discount_value: Number(values.discount_value) || 0,
      subtotal: lineSubtotal,
      total,
      line_items: lineItems.map(({ description, quantity, unit_price, line_total }) => ({
        description,
        quantity,
        unit_price,
        line_total,
      })),
    }
    try {
      if (quotation) {
        await updateQuotation.mutateAsync({ id: quotation.id, ...payload })
        toast.success('Quotation updated')
      } else {
        await createQuotation.mutateAsync(payload)
        toast.success('Quotation created')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save quotation')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={quotation ? 'Edit quotation' : 'New quotation'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createQuotation.isPending || updateQuotation.isPending}
      dirty={isDirty}
    >
      <FormField label="Bill to" htmlFor="billTo" required error={errors.billTo?.message}>
        <Controller
          control={control}
          name="billTo"
          rules={{ required: 'Select a client or lead' }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client or lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Clients</SelectLabel>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={`client:${c.id}`}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Leads</SelectLabel>
                  {leads?.map((l) => (
                    <SelectItem key={l.id} value={`lead:${l.id}`}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label="Title" htmlFor="title" required error={errors.title?.message}>
        <Input id="title" {...register('title', { required: 'Title is required' })} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Issue date" htmlFor="issue_date" required error={errors.issue_date?.message}>
          <Input id="issue_date" type="date" {...register('issue_date', { required: 'Issue date is required' })} />
        </FormField>
        <FormField label="Valid until" htmlFor="valid_until_date" error={errors.valid_until_date?.message}>
          <Input
            id="valid_until_date"
            type="date"
            {...register('valid_until_date', {
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
        {computeDiscountAmount(subtotal, discountType, Number(discountValue) || 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>−{formatMoney(computeDiscountAmount(subtotal, discountType, Number(discountValue) || 0), currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatMoney(computeTotal(subtotal, discountType, Number(discountValue) || 0), currency)}</span>
        </div>
      </div>

      <FormField label="Terms / notes" htmlFor="terms">
        <Textarea id="terms" rows={2} {...register('terms')} />
      </FormField>

      <FormField label="Status" htmlFor="status">
        <SelectField control={control} name="status" options={STATUSES} />
      </FormField>
    </FormSheet>
  )
}
