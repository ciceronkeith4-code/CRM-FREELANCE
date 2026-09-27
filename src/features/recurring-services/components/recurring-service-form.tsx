import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { SelectField, SwitchField } from '@/components/shared/rhf-fields'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useProjects } from '@/features/projects/api'
import { useCreateRecurringService, useUpdateRecurringService } from '@/features/recurring-services/api'
import type { RecurringServiceRow } from '@/types/database'
import { toastError } from '@/lib/errors'
import { nonNegative } from '@/lib/pricing'

const SERVICE_TYPES = ['Hosting', 'Domain', 'SSL', 'Email hosting', 'Maintenance retainer', 'Software subscription', 'Other'] as const
const CYCLES = ['Monthly', 'Quarterly', 'Yearly'] as const
const STATUSES = ['Active', 'Paused', 'Cancelled'] as const

interface FormValues {
  client_id: string
  project_id: string
  service_type: (typeof SERVICE_TYPES)[number]
  provider: string
  description: string
  amount_charged: number
  my_cost: number
  billing_cycle: (typeof CYCLES)[number]
  next_renewal_date: string
  auto_renew_on_provider: boolean
  status: (typeof STATUSES)[number]
}

export function RecurringServiceForm({
  open,
  onOpenChange,
  service,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: RecurringServiceRow
}) {
  const { data: clients } = useClients()
  const { data: projects } = useProjects()
  const createService = useCreateRecurringService()
  const updateService = useUpdateRecurringService()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { service_type: 'Hosting', billing_cycle: 'Monthly', status: 'Active', auto_renew_on_provider: false },
  })

  const clientId = watch('client_id')
  const clientProjects = (projects ?? []).filter((p) => p.client_id === clientId)

  useEffect(() => {
    if (open) {
      reset(
        service
          ? {
              client_id: service.client_id,
              project_id: service.project_id ?? '',
              service_type: service.service_type,
              provider: service.provider ?? '',
              description: service.description ?? '',
              amount_charged: service.amount_charged,
              my_cost: service.my_cost,
              billing_cycle: service.billing_cycle,
              next_renewal_date: service.next_renewal_date ?? '',
              auto_renew_on_provider: service.auto_renew_on_provider,
              status: service.status,
            }
          : { service_type: 'Hosting', billing_cycle: 'Monthly', status: 'Active', auto_renew_on_provider: false },
      )
    }
  }, [open, service, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      project_id: values.project_id || null,
      provider: values.provider || null,
      description: values.description || null,
      next_renewal_date: values.next_renewal_date || null,
      amount_charged: Number(values.amount_charged) || 0,
      my_cost: Number(values.my_cost) || 0,
    }
    try {
      if (service) {
        await updateService.mutateAsync({ id: service.id, ...payload })
        toast.success('Service updated')
      } else {
        await createService.mutateAsync(payload)
        toast.success('Service added')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save service')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={service ? 'Edit recurring service' : 'Add recurring service'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createService.isPending || updateService.isPending}
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

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Service type" htmlFor="service_type">
          <SelectField control={control} name="service_type" options={SERVICE_TYPES} />
        </FormField>
        <FormField label="Provider" htmlFor="provider" description="e.g. Hostinger, Namecheap, Vercel">
          <Input id="provider" {...register('provider')} />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description" description="e.g. the domain name">
        <Input id="description" {...register('description')} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Amount charged to client" htmlFor="amount_charged" error={errors.amount_charged?.message}>
          <Input id="amount_charged" type="number" min="0" step="0.01" {...register('amount_charged', { valueAsNumber: true, ...nonNegative })} />
        </FormField>
        <FormField label="My cost" htmlFor="my_cost" error={errors.my_cost?.message}>
          <Input id="my_cost" type="number" min="0" step="0.01" {...register('my_cost', { valueAsNumber: true, ...nonNegative })} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Billing cycle" htmlFor="billing_cycle">
          <SelectField control={control} name="billing_cycle" options={CYCLES} />
        </FormField>
        <FormField label="Next renewal date" htmlFor="next_renewal_date">
          <Input id="next_renewal_date" type="date" {...register('next_renewal_date')} />
        </FormField>
      </div>

      <SwitchField control={control} name="auto_renew_on_provider" label="Auto-renews on provider" />

      <FormField label="Status" htmlFor="status">
        <SelectField control={control} name="status" options={STATUSES} />
      </FormField>
    </FormSheet>
  )
}
