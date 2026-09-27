/** react-hook-form rule for optional money/hour inputs (empty is fine, negative isn't). */
export const nonNegative = {
  validate: (v: unknown) => v === null || v === '' || v === undefined || Number.isNaN(v) || Number(v) >= 0 || 'Cannot be negative',
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function computeDiscountAmount(subtotal: number, discountType: 'amount' | 'percent' | null | undefined, discountValue: number) {
  if (!discountType || !discountValue || discountValue < 0) return 0
  const raw = discountType === 'percent' ? subtotal * (Math.min(discountValue, 100) / 100) : discountValue
  return round2(Math.min(raw, subtotal))
}

export function computeTotal(subtotal: number, discountType: 'amount' | 'percent' | null | undefined, discountValue: number) {
  return round2(Math.max(subtotal - computeDiscountAmount(subtotal, discountType, discountValue), 0))
}
