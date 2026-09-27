import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { SelectField } from '@/components/shared/rhf-fields'
import { TagsInput } from '@/components/shared/tags-input'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateClient, useUpdateClient } from '@/features/clients/api'
import type { ClientRow } from '@/types/database'
import { Controller } from 'react-hook-form'
import { toastError } from '@/lib/errors'

const PREFERRED_CONTACT = ['Messenger', 'Viber', 'WhatsApp', 'Email', 'Phone', 'Other'] as const
const SOURCES = ['Referral', 'Facebook', 'Instagram', 'LinkedIn', 'Cold outreach', 'Walk-in', 'Website', 'Other'] as const

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  business_type: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  preferred_contact: z.enum(PREFERRED_CONTACT).nullable().optional(),
  social_link: z.string().optional(),
  address: z.string().optional(),
  source: z.enum(SOURCES).nullable().optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ClientForm({
  open,
  onOpenChange,
  client,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: ClientRow
}) {
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { tags: [] } })

  useEffect(() => {
    if (open) {
      reset(
        client
          ? {
              name: client.name,
              company: client.company ?? '',
              business_type: client.business_type ?? '',
              email: client.email ?? '',
              phone: client.phone ?? '',
              preferred_contact: client.preferred_contact,
              social_link: client.social_link ?? '',
              address: client.address ?? '',
              source: client.source,
              tags: client.tags ?? [],
              notes: client.notes ?? '',
            }
          : { tags: [] },
      )
    }
  }, [open, client, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = { ...values, email: values.email || null }
    try {
      if (client) {
        await updateClient.mutateAsync({ id: client.id, ...payload })
        toast.success('Client updated')
      } else {
        await createClient.mutateAsync(payload)
        toast.success('Client added')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save client')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={client ? 'Edit client' : 'Add client'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createClient.isPending || updateClient.isPending}
      dirty={isDirty}
    >
      <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" {...register('name')} />
      </FormField>
      <FormField label="Company / business" htmlFor="company">
        <Input id="company" {...register('company')} />
      </FormField>
      <FormField label="Business type" htmlFor="business_type" description="e.g. gym, clinic, real estate, retail, restaurant">
        <Input id="business_type" {...register('business_type')} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register('email')} />
        </FormField>
        <FormField label="Phone" htmlFor="phone">
          <Input id="phone" {...register('phone')} />
        </FormField>
      </div>
      <FormField label="Preferred contact" htmlFor="preferred_contact">
        <SelectField control={control} name="preferred_contact" options={PREFERRED_CONTACT} allowClear />
      </FormField>
      <FormField label="Social / profile link" htmlFor="social_link">
        <Input id="social_link" {...register('social_link')} />
      </FormField>
      <FormField label="Address" htmlFor="address">
        <Textarea id="address" rows={2} {...register('address')} />
      </FormField>
      <FormField label="Source" htmlFor="source">
        <SelectField control={control} name="source" options={SOURCES} allowClear />
      </FormField>
      <FormField label="Tags" htmlFor="tags">
        <Controller control={control} name="tags" render={({ field }) => <TagsInput value={field.value} onChange={field.onChange} />} />
      </FormField>
      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={3} {...register('notes')} />
      </FormField>
    </FormSheet>
  )
}
