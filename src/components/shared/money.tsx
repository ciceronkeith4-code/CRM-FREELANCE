import { formatMoney } from '@/lib/format'
import { useCurrency } from '@/hooks/use-currency'

export function Money({ amount, className }: { amount: number | null | undefined; className?: string }) {
  const currency = useCurrency()
  return <span className={className}>{formatMoney(amount, currency)}</span>
}
