import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { SelectField } from '@/components/shared/rhf-fields'
import { Input } from '@/components/ui/input'
import { useCreateTask } from '@/features/tasks/api'
import { toastError } from '@/lib/errors'

const PRIORITIES = ['Low', 'Medium', 'High'] as const

interface FormValues {
  title: string
  due_date: string
  priority: (typeof PRIORITIES)[number]
}

export function TaskForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createTask = useCreateTask()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({ defaultValues: { priority: 'Medium' } })

  useEffect(() => {
    if (open) reset({ title: '', due_date: '', priority: 'Medium' })
  }, [open, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      await createTask.mutateAsync({ title: values.title, due_date: values.due_date || null, priority: values.priority })
      toast.success('Task added')
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to add task')
    }
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Add task" onSubmit={handleSubmit(onSubmit)} submitting={createTask.isPending} dirty={isDirty}>
      <FormField label="Title" htmlFor="title" required>
        <Input id="title" {...register('title', { required: true })} />
      </FormField>
      <FormField label="Due date" htmlFor="due_date">
        <Input id="due_date" type="date" {...register('due_date')} />
      </FormField>
      <FormField label="Priority" htmlFor="priority">
        <SelectField control={control} name="priority" options={PRIORITIES} />
      </FormField>
    </FormSheet>
  )
}
