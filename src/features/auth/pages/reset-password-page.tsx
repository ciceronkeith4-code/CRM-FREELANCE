import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { toastError } from '@/lib/errors'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { Spinner } from '@/components/ui/spinner'

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: values.password })
    setSubmitting(false)
    if (error) {
      toastError(error, 'Could not update password')
      return
    }
    toast.success('Password updated')
    navigate('/')
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-xl font-semibold">Set a new password</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-6" />
          </div>
        ) : !user ? (
          <p className="text-center text-sm text-muted-foreground">
            This reset link is invalid or has expired.{' '}
            <Link to="/forgot-password" className="text-foreground underline underline-offset-4">
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField label="New password" htmlFor="password" error={errors.password?.message} required>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            </FormField>
            <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
            </FormField>
            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting && <Spinner />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
