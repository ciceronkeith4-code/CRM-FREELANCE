import { useEffect, useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { SelectField } from '@/components/shared/rhf-fields'
import { FileUploadField } from '@/components/shared/file-upload-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useProjects } from '@/features/projects/api'
import { useCreateExpense, useUpdateExpense } from '@/features/expenses/api'
import { useAuth } from '@/features/auth/auth-context'
import { uploadAttachment } from '@/lib/storage'
import type { ExpenseRow } from '@/types/database'
import { toastError } from '@/lib/errors'
import { todayISO } from '@/lib/format'

const CATEGORIES = ['Hosting', 'Domain', 'Software/Subscription', 'Hardware', 'Internet', 'Transportation', 'Outsourcing', 'Other'] as const

interface FormValues {
  date: string
  category: (typeof CATEGORIES)[number]
  amount: number
  vendor: string
  client_id: string
  project_id: string
  notes: string
}

export function ExpenseForm({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExpenseRow
}) {
  const { data: clients } = useClients()
  const { data: projects } = useProjects()
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const { user } = useAuth()
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { date: todayISO(), category: 'Other' },
  })

  const clientId = useWatch({ control, name: 'client_id' })
  const clientProjects = (projects ?? []).filter((p) => p.client_id === clientId)

  useEffect(() => {
    if (open) {
      reset(
        expense
          ? {
              date: expense.date,
              category: expense.category,
              amount: expense.amount,
              vendor: expense.vendor ?? '',
              client_id: expense.client_id ?? '',
              project_id: expense.project_id ?? '',
              notes: expense.notes ?? '',
            }
          : { date: todayISO(), category: 'Other', amount: 0 },
      )
      setReceiptFile(null)
    }
  }, [open, expense, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      let receipt_path = expense?.receipt_path ?? null
      if (receiptFile && user) {
        receipt_path = await uploadAttachment(user.id, 'receipts', receiptFile)
      }
      const payload = {
        date: values.date,
        category: values.category,
        amount: Number(values.amount) || 0,
        vendor: values.vendor || null,
        client_id: values.client_id || null,
        project_id: values.project_id || null,
        notes: values.notes || null,
        receipt_path,
      }
      if (expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...payload })
        toast.success('Expense updated')
      } else {
        await createExpense.mutateAsync(payload)
        toast.success('Expense added')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save expense')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? 'Edit expense' : 'Add expense'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createExpense.isPending || updateExpense.isPending}
      dirty={isDirty}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date" htmlFor="date">
          <Input id="date" type="date" {...register('date')} />
        </FormField>
        <FormField label="Category" htmlFor="category">
          <SelectField control={control} name="category" options={CATEGORIES} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Amount" htmlFor="amount" required error={errors.amount?.message}>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true, required: 'Amount is required', min: { value: 0.01, message: 'Amount must be greater than 0' } })}
          />
        </FormField>
        <FormField label="Vendor" htmlFor="vendor">
          <Input id="vendor" {...register('vendor')} />
        </FormField>
      </div>

      <FormField label="Client (optional)" htmlFor="client_id">
        <Controller
          control={control}
          name="client_id"
          render={({ field }) => (
            <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
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

      {clientId && clientProjects.length > 0 && (
        <FormField label="Project (optional)" htmlFor="project_id">
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
      )}

      <FormField label="Receipt" htmlFor="receipt">
        <FileUploadField file={receiptFile} onFileChange={setReceiptFile} existingPath={expense?.receipt_path} accept="image/*,.pdf" />
      </FormField>

      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={2} {...register('notes')} />
      </FormField>
    </FormSheet>
  )
}
