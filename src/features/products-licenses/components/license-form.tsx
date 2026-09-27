import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { SelectField } from '@/components/shared/rhf-fields'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useCreateLicense, useUpdateLicense } from '@/features/products-licenses/api'
import type { LicenseRow } from '@/types/database'
import { toastError } from '@/lib/errors'
import { todayISO } from '@/lib/format'
import { nonNegative } from '@/lib/pricing'

const STATUSES = ['Active', 'Support Expired', 'Revoked'] as const

interface FormValues {
  client_id: string
  purchase_date: string
  amount_paid: number
  deployment_url: string
  version_installed: string
  license_key: string
  support_until_date: string
  status: (typeof STATUSES)[number]
  notes: string
}

export function LicenseForm({
  open,
  onOpenChange,
  productId,
  license,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  license?: LicenseRow
}) {
  const { data: clients } = useClients()
  const createLicense = useCreateLicense(productId)
  const updateLicense = useUpdateLicense(productId)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { purchase_date: todayISO(), status: 'Active' },
  })

  useEffect(() => {
    if (open) {
      reset(
        license
          ? {
              client_id: license.client_id,
              purchase_date: license.purchase_date,
              amount_paid: license.amount_paid,
              deployment_url: license.deployment_url ?? '',
              version_installed: license.version_installed ?? '',
              license_key: license.license_key ?? '',
              support_until_date: license.support_until_date ?? '',
              status: license.status,
              notes: license.notes ?? '',
            }
          : { purchase_date: todayISO(), status: 'Active', amount_paid: 0 },
      )
    }
  }, [open, license, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      amount_paid: Number(values.amount_paid) || 0,
      deployment_url: values.deployment_url || null,
      version_installed: values.version_installed || null,
      license_key: values.license_key || null,
      support_until_date: values.support_until_date || null,
      notes: values.notes || null,
    }
    try {
      if (license) {
        await updateLicense.mutateAsync({ id: license.id, ...payload })
        toast.success('License updated')
      } else {
        await createLicense.mutateAsync(payload)
        toast.success('License added')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save license')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={license ? 'Edit license' : 'Sell license'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createLicense.isPending || updateLicense.isPending}
      dirty={isDirty}
    >
      <FormField label="Client" htmlFor="client_id" required error={errors.client_id?.message}>
        <Controller
          control={control}
          name="client_id"
          rules={{ required: 'Select a client' }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Purchase date" htmlFor="purchase_date">
          <Input id="purchase_date" type="date" {...register('purchase_date')} />
        </FormField>
        <FormField label="Amount paid" htmlFor="amount_paid" error={errors.amount_paid?.message}>
          <Input id="amount_paid" type="number" min="0" step="0.01" {...register('amount_paid', { valueAsNumber: true, ...nonNegative })} />
        </FormField>
      </div>

      <FormField label="Deployment URL" htmlFor="deployment_url">
        <Input id="deployment_url" {...register('deployment_url')} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Version installed" htmlFor="version_installed">
          <Input id="version_installed" {...register('version_installed')} />
        </FormField>
        <FormField label="Support until" htmlFor="support_until_date">
          <Input id="support_until_date" type="date" {...register('support_until_date')} />
        </FormField>
      </div>

      <FormField label="License key" htmlFor="license_key" description="Optional">
        <Input id="license_key" {...register('license_key')} />
      </FormField>

      <FormField label="Status" htmlFor="status">
        <SelectField control={control} name="status" options={STATUSES} />
      </FormField>

      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={2} {...register('notes')} />
      </FormField>
    </FormSheet>
  )
}
