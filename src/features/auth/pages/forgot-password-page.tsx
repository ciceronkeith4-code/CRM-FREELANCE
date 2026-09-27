import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { Spinner } from '@/components/ui/spinner'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-xl font-semibold">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">We'll email you a reset link</p>
        </div>
        {sent ? (
          <p className="text-center text-sm text-muted-foreground">
            Check your inbox for a link to reset your password.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
            </FormField>
            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting && <Spinner />}
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
