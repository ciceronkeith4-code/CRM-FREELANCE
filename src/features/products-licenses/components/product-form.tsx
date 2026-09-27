import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormSheet } from '@/components/shared/form-sheet'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProduct, useUpdateProduct } from '@/features/products-licenses/api'
import type { ProductRow } from '@/types/database'
import { toastError } from '@/lib/errors'
import { nonNegative } from '@/lib/pricing'

interface FormValues {
  name: string
  description: string
  current_version: string
  standard_price: number
  notes: string
}

export function ProductForm({
  open,
  onOpenChange,
  product,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: ProductRow
}) {
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>()

  useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              name: product.name,
              description: product.description ?? '',
              current_version: product.current_version ?? '',
              standard_price: product.standard_price,
              notes: product.notes ?? '',
            }
          : { standard_price: 0 },
      )
    }
  }, [open, product, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = { ...values, standard_price: Number(values.standard_price) || 0 }
    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...payload })
        toast.success('Product updated')
      } else {
        await createProduct.mutateAsync(payload)
        toast.success('Product added')
      }
      onOpenChange(false)
    } catch (err) {
      toastError(err, 'Failed to save product')
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={product ? 'Edit product' : 'Add product'}
      onSubmit={handleSubmit(onSubmit)}
      submitting={createProduct.isPending || updateProduct.isPending}
      dirty={isDirty}
    >
      <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" {...register('name', { required: 'Name is required' })} />
      </FormField>
      <FormField label="Description" htmlFor="description">
        <Textarea id="description" rows={3} {...register('description')} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Current version" htmlFor="current_version">
          <Input id="current_version" {...register('current_version')} />
        </FormField>
        <FormField label="Standard price" htmlFor="standard_price" error={errors.standard_price?.message}>
          <Input id="standard_price" type="number" min="0" step="0.01" {...register('standard_price', { valueAsNumber: true, ...nonNegative })} />
        </FormField>
      </div>
      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={2} {...register('notes')} />
      </FormField>
    </FormSheet>
  )
}
