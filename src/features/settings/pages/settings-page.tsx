import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Database, LogOut, UploadCloud } from 'lucide-react'
import {
  useSettings,
  useUpdateSettings,
  useSeedSampleData,
  useClearSampleData,
} from '@/features/settings/api'
import { useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { uploadAttachment, getAttachmentUrl } from '@/lib/storage'
import { SUPPORTED_CURRENCIES } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField } from '@/components/shared/form-field'
import { SelectField } from '@/components/shared/rhf-fields'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { toastError } from '@/lib/errors'
import { DetailSkeleton } from '@/components/shared/skeletons'

type FormValues = {
  business_name: string
  owner_name: string
  email: string
  phone: string
  address: string
  tin: string
  currency: string
  payment_instructions: string
  default_downpayment_percent: number
  invoice_prefix: string
  quote_prefix: string
  renewal_reminder_days: number
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const seedSampleData = useSeedSampleData()
  const clearSampleData = useClearSampleData()
  const { user } = useAuth()

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile])
  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
  }, [logoPreview])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  useEffect(() => {
    if (settings) {
      reset({
        business_name: settings.business_name ?? '',
        owner_name: settings.owner_name ?? '',
        email: settings.email ?? '',
        phone: settings.phone ?? '',
        address: settings.address ?? '',
        tin: settings.tin ?? '',
        currency: settings.currency,
        payment_instructions: settings.payment_instructions ?? '',
        default_downpayment_percent: settings.default_downpayment_percent,
        invoice_prefix: settings.invoice_prefix,
        quote_prefix: settings.quote_prefix,
        renewal_reminder_days: settings.renewal_reminder_days,
      })
    }
  }, [settings, reset])

  useEffect(() => {
    if (settings?.logo_path) {
      getAttachmentUrl(settings.logo_path).then(setLogoUrl).catch(() => {})
    }
  }, [settings?.logo_path])

  const onSubmit = async (values: FormValues) => {
    if (!settings) return
    try {
      let logo_path = settings.logo_path
      if (logoFile && user) {
        logo_path = await uploadAttachment(user.id, 'logo', logoFile)
      }
      await updateSettings.mutateAsync({
        id: settings.id,
        ...values,
        default_downpayment_percent: Number(values.default_downpayment_percent),
        renewal_reminder_days: Number(values.renewal_reminder_days),
        logo_path,
      })
      toast.success('Settings saved')
      setLogoFile(null)
    } catch (err) {
      toastError(err, 'Failed to save settings')
    }
  }

  if (isLoading || !settings) return <DetailSkeleton stats={0} />

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Business details used across quotations and invoices.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Business settings</CardTitle>
            <CardDescription>These appear on your quotations and invoices.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-lg">
                <AvatarImage src={logoPreview ?? logoUrl ?? undefined} />
                <AvatarFallback className="rounded-lg">{settings.business_name?.[0] ?? 'B'}</AvatarFallback>
              </Avatar>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <UploadCloud /> Upload logo
                  </span>
                </Button>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Business name" htmlFor="business_name">
                <Input id="business_name" {...register('business_name')} />
              </FormField>
              <FormField label="Owner name" htmlFor="owner_name">
                <Input id="owner_name" {...register('owner_name')} />
              </FormField>
              <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })}
                />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" {...register('phone')} />
              </FormField>
              <FormField label="TIN" htmlFor="tin" description="Optional">
                <Input id="tin" {...register('tin')} />
              </FormField>
              <FormField label="Currency" htmlFor="currency">
                <SelectField control={control} name="currency" options={SUPPORTED_CURRENCIES} />
              </FormField>
            </div>

            <FormField label="Address" htmlFor="address">
              <Textarea id="address" rows={2} {...register('address')} />
            </FormField>

            <FormField
              label="Payment instructions"
              htmlFor="payment_instructions"
              description="e.g. GCash number, bank details. Shown on invoices."
            >
              <Textarea id="payment_instructions" rows={3} {...register('payment_instructions')} />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Default downpayment %" htmlFor="default_downpayment_percent" error={errors.default_downpayment_percent?.message}>
                <Input id="default_downpayment_percent" type="number" step="1" min="0" max="100" {...register('default_downpayment_percent', {
                    validate: (v) => (v !== undefined && String(v) !== '' && Number(v) >= 0 && Number(v) <= 100) || 'Enter a number from 0 to 100',
                  })} />
              </FormField>
              <FormField label="Renewal reminder lead time (days)" htmlFor="renewal_reminder_days" error={errors.renewal_reminder_days?.message}>
                <Input id="renewal_reminder_days" type="number" step="1" min="0" {...register('renewal_reminder_days', {
                    validate: (v) => (v !== undefined && String(v) !== '' && Number.isInteger(Number(v)) && Number(v) >= 0) || 'Enter a whole number of days (0 or more)',
                  })} />
              </FormField>
              <FormField label="Quote number prefix" htmlFor="quote_prefix">
                <Input id="quote_prefix" {...register('quote_prefix')} />
              </FormField>
              <FormField label="Invoice number prefix" htmlFor="invoice_prefix">
                <Input id="invoice_prefix" {...register('invoice_prefix')} />
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                Save settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Sample data</CardTitle>
          <CardDescription>Preview the app with example leads, clients, projects, and more.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => setSeedConfirmOpen(true)} disabled={seedSampleData.isPending}>
            <Database /> Load sample data
          </Button>
          <Button variant="outline" onClick={() => setClearConfirmOpen(true)} disabled={clearSampleData.isPending}>
            Clear sample data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
          <Button variant="outline" className="w-fit" onClick={() => supabase.auth.signOut()}>
            <LogOut /> Sign out
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={seedConfirmOpen}
        onOpenChange={setSeedConfirmOpen}
        title="Load sample data?"
        description="This adds example leads, clients, projects, invoices, and more so you can preview the app."
        confirmLabel="Load sample data"
        destructive={false}
        onConfirm={() => {
          seedSampleData.mutate(undefined, {
            onSuccess: () => toast.success('Sample data loaded'),
            onError: (err) => toastError(err, 'Failed to load sample data'),
          })
          setSeedConfirmOpen(false)
        }}
      />
      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear sample data?"
        description="This permanently removes all sample records. Your real data is not affected."
        confirmLabel="Clear sample data"
        onConfirm={() => {
          clearSampleData.mutate(undefined, {
            onSuccess: () => toast.success('Sample data cleared'),
            onError: (err) => toastError(err, 'Failed to clear sample data'),
          })
          setClearConfirmOpen(false)
        }}
      />
    </div>
  )
}
