import { format, parseISO } from 'date-fns'

const CURRENCY_LOCALE: Record<string, string> = {
  PHP: 'en-PH',
  USD: 'en-US',
  EUR: 'en-DE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  SGD: 'en-SG',
  CAD: 'en-CA',
  JPY: 'ja-JP',
}

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_LOCALE)

// Building an Intl.NumberFormat is relatively costly; animated counters format every frame.
const moneyFormatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number | null | undefined, currency = 'PHP') {
  const value = amount ?? 0
  let formatter = moneyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    moneyFormatters.set(currency, formatter)
  }
  return formatter.format(value)
}

/** Today's date as YYYY-MM-DD in the user's local timezone (toISOString() would give the UTC date). */
export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy h:mm a')
}

export function formatNumber(value: number | null | undefined, fractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value ?? 0)
}
