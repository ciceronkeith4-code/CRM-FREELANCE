import { useLogoUrl, useSettings } from '@/features/settings/api'
import { formatMoney, formatDate } from '@/lib/format'
import { computeDiscountAmount } from '@/lib/pricing'

export interface PrintableLineItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export function PrintableDocument({
  docLabel,
  number,
  issueDate,
  secondDateLabel,
  secondDate,
  billToName,
  billToDetails,
  lineItems,
  subtotal,
  discountType,
  discountValue,
  total,
  notes,
  statusNode,
}: {
  docLabel: string
  number: string | null
  issueDate: string
  secondDateLabel: string
  secondDate: string | null
  billToName: string
  billToDetails: (string | null | undefined)[]
  lineItems: PrintableLineItem[]
  subtotal: number
  discountType: 'amount' | 'percent' | null
  discountValue: number
  total: number
  notes?: string | null
  statusNode?: React.ReactNode
}) {
  const { data: settings } = useSettings()
  const { data: logoUrl } = useLogoUrl()
  const currency = settings?.currency ?? 'PHP'
  const discountAmount = computeDiscountAmount(subtotal, discountType, discountValue)

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border bg-card p-8 print:border-none print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4 break-inside-avoid">
        <div className="min-w-0">
          {logoUrl && <img src={logoUrl} alt="" className="mb-2 h-12 w-auto max-w-48 object-contain" />}
          <h2 className="font-heading text-lg font-semibold">{settings?.business_name || 'Your Business'}</h2>
          <div className="mt-1 flex flex-col text-sm text-muted-foreground">
            {settings?.owner_name && <span>{settings.owner_name}</span>}
            {settings?.email && <span>{settings.email}</span>}
            {settings?.phone && <span>{settings.phone}</span>}
            {settings?.address && <span>{settings.address}</span>}
            {settings?.tin && <span>TIN: {settings.tin}</span>}
          </div>
        </div>
        <div className="text-right">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-tight">{docLabel}</h1>
          <p className="text-sm text-muted-foreground">{number}</p>
          {statusNode}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Bill to</p>
          <p className="mt-1 font-medium [overflow-wrap:anywhere]">{billToName}</p>
          {billToDetails.filter(Boolean).map((line, i) => (
            <p key={i} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
        <div className="text-right">
          <p>
            <span className="text-muted-foreground">Issue date: </span>
            {formatDate(issueDate)}
          </p>
          {secondDate && (
            <p>
              <span className="text-muted-foreground">{secondDateLabel}: </span>
              {formatDate(secondDate)}
            </p>
          )}
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Unit price</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i} className="break-inside-avoid border-b">
              <td className="py-2 pr-2 [overflow-wrap:anywhere]">{item.description}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{formatMoney(item.unit_price, currency)}</td>
              <td className="py-2 text-right">{formatMoney(item.line_total, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-56 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatMoney(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t py-1.5 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div className="mt-6 text-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Notes</p>
          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{notes}</p>
        </div>
      )}

      {settings?.payment_instructions && (
        <div className="mt-6 text-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Payment instructions</p>
          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{settings.payment_instructions}</p>
        </div>
      )}
    </div>
  )
}
