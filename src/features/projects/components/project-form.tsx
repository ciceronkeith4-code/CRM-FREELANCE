import { useEffect } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { Reveal } from '@/components/shared/reveal'
import { SelectField } from '@/components/shared/rhf-fields'
import { TagsInput } from '@/components/shared/tags-input'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useCreateProject, useUpdateProject } from '@/features/projects/api'
import type { ProjectRow } from '@/types/database'
import { toastError } from '@/lib/errors'
import { nonNegative } from '@/lib/pricing'

const PROJECT_TYPES = ['Website', 'Website redesign', 'Web app/System', 'E-commerce', 'Mobile app', 'Maintenance', 'Other'] as const
const PRICING_MODELS = ['Fixed price', 'Hourly', 'Retainer'] as const
const STATUSES = ['Planning', 'In Progress', 'On Hold', 'For Review', 'Completed', 'Cancelled'] as const
const TECH_SUGGESTIONS = ['React', 'Next.js', 'Vue', 'WordPress', 'Shopify', 'Supabase', 'Node.js', 'Tailwind', 'PHP', 'Laravel']

interface FormValues {
  client_id: string
  title: string
  description: string
  project_type: (typeof PROJECT_TYPES)[number] | null
  pricing_model: (typeof PRICING_MODELS)[number]
  base_price: number
  hourly_rate: number | null
  estimated_hours: number | null
  status: (typeof STATUSES)[number]
  start_date: string
  deadline: string
  completion_date: string
  warranty_end_date: string
  tech_stack: string[]
  live_url: string
  staging_url: string
  repository_url: string
  hosting_provider: string
  domain_registrar: string
  notes: string
}

export function ProjectForm({
  open,
  onOpenChange,
  project,
  defaultClientId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectRow
  defaultClientId?: string
}) {
  const { data: clients } = useClients()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { pricing_model: 'Fixed price', status: 'Planning', tech_stack: [] },
  })

  const pricingModel = useWatch({ control, name: 'pricing_model' })

  useEffect(() => {
    if (open) {
      reset(
        project
          ? {
              client_id: project.client_id,
              title: project.title,
              description: project.description ?? '',
              project_type: project.project_type,
              pricing_model: project.pricing_model,
              base_price: project.base_price,
              hourly_rate: project.hourly_rate,
              estimated_hours: project.estimated_hours,
              status: project.status,
              start_date: project.start_date ?? '',
              deadline: project.deadline ?? '',
              completion_date: project.completion_date ?? '',
              warranty_end_date: project.warranty_end_date ?? '',
              tech_stack: project.tech_stack ?? [],
              live_url: project.live_url ?? '',
              staging_url: project.staging_url ?? '',
              repository_url: project.repository_url ?? '',
              hosting_provider: project.hosting_provider ?? '',
              domain_registrar: project.domain_registrar ?? '',
              notes: project.notes ?? '',
            }
          : { client_id: defaultClientId ?? '', pricing_model: 'Fixed price', status: 'Planning', tech_stack: [] },
      )
    }
  }, [open, project, defaultClientId, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      base_price: Number(values.base_price) || 0,
      hourly_rate: values.hourly_rate ? Number(values.hourly_rate) : null,
      estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : null,
      start_date: values.start_date || null,
      deadline: values.deadline || null,
      completion_date: values.completion_date || null,
      warranty_end_date: values.warranty_end_date || null,
      description: values.description || null,
      live_url: values.live_url || null,
      staging_url: values.staging_url || null,
      repository_url: values.repository_url || null,
      hosting_provider: values.hosting_provider || null,
      domain_registrar: values.domain_registrar || null,
    }
    try {
      if (project) {
        await updateProject.mutateAsync({ id: project.id, ...payload })
        toast.success('Project updated')
      } else {
        await createProject.mutateAsync(payload)
        toast.success('Project created')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save project')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={project ? 'Edit project' : 'New project'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createProject.isPending || updateProject.isPending}
      dirty={isDirty}
    >
      <FormField label="Client" htmlFor="client_id" required error={errors.client_id?.message}>
        <Controller
          control={control}
          name="client_id"
          rules={{ required: 'Select a client' }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultClientId && !project}>
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
      <FormField label="Title" htmlFor="title" required error={errors.title?.message}>
        <Input id="title" {...register('title', { required: 'Title is required' })} />
      </FormField>
      <FormField label="Description" htmlFor="description">
        <Textarea id="description" rows={3} {...register('description')} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Project type" htmlFor="project_type">
          <SelectField control={control} name="project_type" options={PROJECT_TYPES} allowClear />
        </FormField>
        <FormField label="Pricing model" htmlFor="pricing_model">
          <SelectField control={control} name="pricing_model" options={PRICING_MODELS} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Base price" htmlFor="base_price" error={errors.base_price?.message}>
          <Input id="base_price" type="number" min="0" step="0.01" {...register('base_price', { valueAsNumber: true, ...nonNegative })} />
        </FormField>
        <Reveal when={pricingModel === 'Hourly'}>
          <FormField label="Hourly rate" htmlFor="hourly_rate" error={errors.hourly_rate?.message}>
            <Input id="hourly_rate" type="number" min="0" step="0.01" {...register('hourly_rate', { valueAsNumber: true, ...nonNegative })} />
          </FormField>
        </Reveal>
      </div>
      <FormField label="Estimated hours" htmlFor="estimated_hours" error={errors.estimated_hours?.message}>
        <Input id="estimated_hours" type="number" min="0" step="0.5" {...register('estimated_hours', { valueAsNumber: true, ...nonNegative })} />
      </FormField>

      <FormField label="Status" htmlFor="status">
        <SelectField control={control} name="status" options={STATUSES} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date" htmlFor="start_date">
          <Input id="start_date" type="date" {...register('start_date')} />
        </FormField>
        <FormField label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
          <Input
            id="deadline"
            type="date"
            {...register('deadline', {
              validate: (v, all) => !v || !all.start_date || v >= all.start_date || 'Must be on or after the start date',
            })}
          />
        </FormField>
        <FormField label="Completion date" htmlFor="completion_date" error={errors.completion_date?.message}>
          <Input
            id="completion_date"
            type="date"
            {...register('completion_date', {
              validate: (v, all) => !v || !all.start_date || v >= all.start_date || 'Must be on or after the start date',
            })}
          />
        </FormField>
        <FormField label="Support/warranty end date" htmlFor="warranty_end_date">
          <Input id="warranty_end_date" type="date" {...register('warranty_end_date')} />
        </FormField>
      </div>

      <FormField label="Tech stack" htmlFor="tech_stack">
        <Controller
          control={control}
          name="tech_stack"
          render={({ field }) => <TagsInput value={field.value} onChange={field.onChange} suggestions={TECH_SUGGESTIONS} />}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Live URL" htmlFor="live_url">
          <Input id="live_url" {...register('live_url')} />
        </FormField>
        <FormField label="Staging URL" htmlFor="staging_url">
          <Input id="staging_url" {...register('staging_url')} />
        </FormField>
        <FormField label="Repository URL" htmlFor="repository_url">
          <Input id="repository_url" {...register('repository_url')} />
        </FormField>
        <FormField label="Hosting provider" htmlFor="hosting_provider">
          <Input id="hosting_provider" {...register('hosting_provider')} />
        </FormField>
        <FormField label="Domain registrar" htmlFor="domain_registrar">
          <Input id="domain_registrar" {...register('domain_registrar')} />
        </FormField>
      </div>

      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={3} {...register('notes')} />
      </FormField>
    </FormSheet>
  )
}
