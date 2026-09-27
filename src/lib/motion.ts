import type { Transition, Variants } from 'motion/react'

/**
 * Single source of truth for motion. CSS-driven animations (Radix overlays,
 * hover states) read the matching custom properties in index.css, so JS and
 * CSS animations share the same timing.
 *
 * Only transform and opacity are animated, so everything stays on the
 * compositor at 60fps. Reduced motion is handled globally by
 * <MotionConfig reducedMotion="user"> plus a CSS media query.
 */

export const duration = {
  /** hover, press, toggles */
  micro: 0.15,
  /** modals, dropdowns, panels */
  overlay: 0.22,
  /** route changes (upper bound) */
  page: 0.25,
  /** number count-up on stat cards */
  countUp: 0.8,
} as const

export const ease = {
  /** entering: fast start, gentle landing */
  out: [0.16, 1, 0.3, 1],
  /** leaving: gentle start, quick finish */
  in: [0.7, 0, 0.84, 0],
  inOut: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, [number, number, number, number]>

export const spring = {
  /** slide-overs, drawers, drag-and-drop */
  gentle: { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 },
  /** tab indicator, small layout shifts */
  snappy: { type: 'spring', stiffness: 500, damping: 38 },
} as const satisfies Record<string, Transition>

/** Keep list stagger under ~300ms total no matter how many items there are. */
export function staggerDelay(index: number, perItem = 0.025, max = 0.25) {
  return Math.min(index * perItem, max)
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: duration.page, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: duration.micro, ease: ease.in } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.overlay, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: duration.micro, ease: ease.in } },
}

/** List rows/cards: enter with fade + small slide, leave with a fade. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: duration.overlay, ease: ease.out, delay: staggerDelay(index) },
  }),
  exit: { opacity: 0, scale: 0.98, transition: { duration: duration.micro, ease: ease.in } },
}

/** Inline messages and conditionally shown fields. */
export const reveal: Variants = {
  hidden: { opacity: 0, y: -4 },
  show: { opacity: 1, y: 0, transition: { duration: duration.micro, ease: ease.out } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1, ease: ease.in } },
}
