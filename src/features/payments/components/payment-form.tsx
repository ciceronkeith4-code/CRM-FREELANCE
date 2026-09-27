import { useEffect, useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { Reveal } from '@/components/shared/reveal'
import { SelectField } from '@/components/shared/rhf-fields'
import { FileUploadField } from '@/components/shared/file-upload-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useProjects } from '@/features/projects/api'
import { useCreatePayment, useUpdatePayment } from '@/features/payments/api'
import { useAuth } from '@/features/auth/auth-context'
import { uploadAttachment } from '@/lib/storage'
import type { PaymentRow } from '@/types/database'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toastError } from '@/lib/errors'
import { todayISO } from '@/lib/format'

const METHODS = ['GCash', 'Maya', 'Bank transfer', 'PayPal', 'Wise', 'Cash', 'Other'] as const
const TYPES = ['Downpayment', 'Milestone', 'Full payment', 'Change request', 'Recurring service', 'License', 'Other'] as const

interface FormValues {
  client_id: string
  project_id: string
  invoice_id: string
  amount: number
  date_paid: string
  method: (typeof METHODS)[number] | null
  payment_type: (typeof TYPES)[number] | null
  reference_number: string
  notes: string
}

export function PaymentForm({
  open,
  onOpenChange,
  payment,
  defaultClientId,
  defaultProjectId,
  defaultInvoiceId,
  defaultAmount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: PaymentRow
  defaultClientId?: string
  defaultProjectId?: string
  defaultInvoiceId?: string
  defaultAmount?: number
}) {
  const { data: clients } = useClients()
  const { data: projects } = useProjects()
  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()
  const { user } = useAuth()
  const [proofFile, setProofFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { date_paid: todayISO() },
  })

  const clientId = useWatch({ control, name: 'client_id' })
  const projectId = useWatch({ control, name: 'project_id' })

  const { data: invoices } = useQuery({
    queryKey: ['clients', clientId, 'invoices_for_payment', projectId],
    enabled: !!clientId,
    queryFn: async () => {
      let query = supabase.from('invoices').select('id, number').eq('client_id', clientId)
      if (projectId) query = query.eq('project_id', projectId)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const clientProjects = (projects ?? []).filter((p) => p.client_id === clientId)

  useEffect(() => {
    if (open) {
      reset(
        payment
          ? {
              client_id: payment.client_id,
              project_id: payment.project_id ?? '',
              invoice_id: payment.invoice_id ?? '',
              amount: payment.amount,
              date_paid: payment.date_paid,
              method: payment.method,
              payment_type: payment.payment_type,
              reference_number: payment.reference_number ?? '',
              notes: payment.notes ?? '',
            }
          : {
              client_id: defaultClientId ?? '',
              project_id: defaultProjectId ?? '',
              invoice_id: defaultInvoiceId ?? '',
              amount: defaultAmount ?? 0,
              date_paid: todayISO(),
              method: null,
              payment_type: null,
              reference_number: '',
              notes: '',
            },
      )
      setProofFile(null)
    }
  }, [open, payment, defaultClientId, defaultProjectId, defaultInvoiceId, defaultAmount, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      let proof_path = payment?.proof_path ?? null
      if (proofFile && user) {
        proof_path = await uploadAttachment(user.id, 'payment-proofs', proofFile)
      }
      const payload = {
        client_id: values.client_id,
        project_id: values.project_id || null,
        invoice_id: values.invoice_id || null,
        amount: Number(values.amount) || 0,
        date_paid: values.date_paid,
        method: values.method,
        payment_type: values.payment_type,
        reference_number: values.reference_number || null,
        notes: values.notes || null,
        proof_path,
      }
      if (payment) {
        await updatePayment.mutateAsync({ id: payment.id, ...payload })
        toast.success('Payment updated')
      } else {
        await createPayment.mutateAsync(payload)
        toast.success('Payment recorded')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save payment')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={payment ? 'Edit payment' : 'Record payment'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createPayment.isPending || updatePayment.isPending}
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
                setValue('invoice_id', '')
              }}
            >
              <SelectTrigger className="w-full">
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

      <Reveal when={!!clientId} className="grid grid-cols-2 gap-4">
        <>
          <FormField label="Project" htmlFor="project_id">
            <Controller
              control={control}
              name="project_id"
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                  <SelectTrigger className="w-full">
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
          <FormField label="Invoice" htmlFor="invoice_id">
            <Controller
              control={control}
              name="invoice_id"
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No invoice</SelectItem>
                    {invoices?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </>
      </Reveal>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Amount" htmlFor="amount" required error={errors.amount?.message}>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true, required: 'Amount is required', min: { value: 0.01, message: 'Amount must be greater than 0' } })}
          />
        </FormField>
        <FormField label="Date paid" htmlFor="date_paid">
          <Input id="date_paid" type="date" {...register('date_paid')} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Method" htmlFor="method">
          <SelectField control={control} name="method" options={METHODS} allowClear />
        </FormField>
        <FormField label="Payment type" htmlFor="payment_type">
          <SelectField control={control} name="payment_type" options={TYPES} allowClear />
        </FormField>
      </div>

      <FormField label="Reference number" htmlFor="reference_number">
        <Input id="reference_number" {...register('reference_number')} />
      </FormField>

      <FormField label="Proof of payment" htmlFor="proof">
        <FileUploadField file={proofFile} onFileChange={setProofFile} existingPath={payment?.proof_path} accept="image/*,.pdf" />
      </FormField>

      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={2} {...register('notes')} />
      </FormField>
    </FormSheet>
  )
}
