import { useLayoutEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { formatMoney, formatNumber } from '@/lib/format'
import { useCurrency } from '@/hooks/use-currency'
import { duration, ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * A number that counts up to its value on first show, and glides from the old
 * value to the new one when it changes. Text is written straight to the DOM
 * node, so animating doesn't re-render React every frame. Tabular figures keep
 * the width steady while digits change. Reduced motion shows the value as-is.
 */
export function CountUp({
  value,
  money = false,
  className,
}: {
  value: number | null | undefined
  /** Format as currency (the business's configured currency) instead of a whole number. */
  money?: boolean
  className?: string
}) {
  const currency = useCurrency()
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const format = (n: number) => (money ? formatMoney(n, currency) : formatNumber(Math.round(n)))
    const target = Number(value) || 0

    if (reduceMotion || shown.current === target) {
      shown.current = target
      el.textContent = format(target)
      return
    }
    const controls = animate(shown.current, target, {
      duration: duration.countUp,
      ease: ease.out,
      onUpdate: (n) => {
        shown.current = n
        el.textContent = format(n)
      },
    })
    return () => controls.stop()
  }, [value, money, currency, reduceMotion])

  return <span ref={ref} className={cn('tabular-nums', className)} />
}
