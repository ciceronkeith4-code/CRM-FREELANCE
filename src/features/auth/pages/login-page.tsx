import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { Spinner } from '@/components/ui/spinner'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword(values)
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-xl font-semibold">FreelanceOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
          </FormField>
          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          </FormField>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting && <Spinner />}
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link to="/signup" className="text-foreground underline underline-offset-4">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
