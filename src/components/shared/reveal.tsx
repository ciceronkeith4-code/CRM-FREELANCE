import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { reveal } from '@/lib/motion'

/**
 * Shows conditional form fields (e.g. "Lost reason" once a lead is marked Lost)
 * with a short fade + slide instead of popping in. Height is deliberately not
 * animated — that would reflow the whole form every frame.
 */
export function Reveal({ when, children, className }: { when: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {when && (
        <motion.div key="reveal" variants={reveal} initial="hidden" animate="show" exit="exit" className={className}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
