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

const schema = z
  .object({
    fullName: z.string().min(1, 'Enter your name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (data.session) {
      toast.success('Welcome to FreelanceOS!')
      navigate('/')
    } else {
      toast.success('Check your email to confirm your account, then sign in.')
      navigate('/login')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-xl font-semibold">FreelanceOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create your workspace</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Full name" htmlFor="fullName" error={errors.fullName?.message} required>
            <Input id="fullName" autoComplete="name" {...register('fullName')} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
          </FormField>
          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          </FormField>
          <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting && <Spinner />}
            Create account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
