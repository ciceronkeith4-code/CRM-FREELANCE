import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { Reveal } from '@/components/shared/reveal'
import { SelectField } from '@/components/shared/rhf-fields'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateLead, useUpdateLead } from '@/features/leads/api'
import type { LeadRow } from '@/types/database'
import { toastError } from '@/lib/errors'
import { nonNegative } from '@/lib/pricing'

const PREFERRED_CONTACT = ['Messenger', 'Viber', 'WhatsApp', 'Email', 'Phone', 'Other'] as const
const SOURCES = ['Referral', 'Facebook', 'Instagram', 'LinkedIn', 'Cold outreach', 'Walk-in', 'Website', 'Other'] as const
const SERVICES = ['Website', 'Website redesign', 'Web app/System', 'E-commerce', 'Maintenance', 'Other'] as const
const STAGES = ['New', 'Contacted', 'Interested', 'Proposal Sent', 'Negotiating', 'Won', 'Lost'] as const

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  business_type: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  preferred_contact: z.enum(PREFERRED_CONTACT).nullable().optional(),
  social_link: z.string().optional(),
  source: z.enum(SOURCES).nullable().optional(),
  service_interested_in: z.enum(SERVICES).nullable().optional(),
  estimated_value: z
    .union([z.number(), z.nan()])
    .optional()
    .refine((v) => v === undefined || Number.isNaN(v) || v >= 0, 'Cannot be negative'),
  stage: z.enum(STAGES),
  next_follow_up_date: z.string().optional(),
  lost_reason: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function LeadForm({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: LeadRow
}) {
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stage: 'New' },
  })

  const stage = watch('stage')

  useEffect(() => {
    if (open) {
      reset(
        lead
          ? {
              name: lead.name,
              company: lead.company ?? '',
              business_type: lead.business_type ?? '',
              email: lead.email ?? '',
              phone: lead.phone ?? '',
              preferred_contact: lead.preferred_contact,
              social_link: lead.social_link ?? '',
              source: lead.source,
              service_interested_in: lead.service_interested_in,
              estimated_value: lead.estimated_value ?? undefined,
              stage: lead.stage,
              next_follow_up_date: lead.next_follow_up_date ?? '',
              lost_reason: lead.lost_reason ?? '',
              notes: lead.notes ?? '',
            }
          : { stage: 'New' },
      )
    }
  }, [open, lead, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      email: values.email || null,
      estimated_value: Number.isNaN(values.estimated_value) ? null : values.estimated_value,
      next_follow_up_date: values.next_follow_up_date || null,
      lost_reason: values.stage === 'Lost' ? values.lost_reason || null : null,
    }
    try {
      if (lead) {
        await updateLead.mutateAsync({ id: lead.id, ...payload })
        toast.success('Lead updated')
      } else {
        await createLead.mutateAsync(payload)
        toast.success('Lead added')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save lead')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={lead ? 'Edit lead' : 'Add lead'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createLead.isPending || updateLead.isPending}
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
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Source" htmlFor="source">
          <SelectField control={control} name="source" options={SOURCES} allowClear />
        </FormField>
        <FormField label="Service interested in" htmlFor="service_interested_in">
          <SelectField control={control} name="service_interested_in" options={SERVICES} allowClear />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Estimated value" htmlFor="estimated_value" error={errors.estimated_value?.message}>
          <Input id="estimated_value" type="number" min="0" step="0.01" {...register('estimated_value', { valueAsNumber: true, ...nonNegative })} />
        </FormField>
        <FormField label="Stage" htmlFor="stage">
          <SelectField control={control} name="stage" options={STAGES} />
        </FormField>
      </div>
      <FormField label="Next follow-up date" htmlFor="next_follow_up_date">
        <Input id="next_follow_up_date" type="date" {...register('next_follow_up_date')} />
      </FormField>
      <Reveal when={stage === 'Lost'}>
        <FormField label="Lost reason" htmlFor="lost_reason">
          <Textarea id="lost_reason" rows={2} {...register('lost_reason')} />
        </FormField>
      </Reveal>
      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={3} {...register('notes')} />
      </FormField>
    </FormSheet>
  )
}
