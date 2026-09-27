import { useReducedMotion } from 'motion/react'

/**
 * Recharts animates SVG geometry itself (it can't be moved to transform/opacity),
 * so keep it short and ease-out, and turn it off entirely for reduced motion.
 */
export function useChartAnimation() {
  const reduceMotion = useReducedMotion()
  return {
    isAnimationActive: !reduceMotion,
    animationDuration: 600,
    animationEasing: 'ease-out' as const,
  }
}
