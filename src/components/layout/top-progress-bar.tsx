import { useEffect, useRef, useState } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useNavigation } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'running' | 'finishing'

/**
 * Thin bar at the top of the screen while data loads or a route resolves.
 * Animates only transform (scaleX) and opacity. Waits 150ms before showing so
 * quick, cached loads don't flash it.
 */
export function TopProgressBar() {
  const fetching = useIsFetching() > 0
  const mutating = useIsMutating() > 0
  const navigating = useNavigation().state !== 'idle'
  const busy = fetching || mutating || navigating

  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const phaseRef = useRef<Phase>('idle')
  const timers = useRef<number[]>([])

  useEffect(() => {
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
    const go = (p: Phase) => {
      phaseRef.current = p
      setPhase(p)
    }
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []

    if (busy) {
      later(() => {
        go('running')
        setProgress(0.15)
        // Trickle toward (never reaching) the end while work continues.
        later(() => setProgress(0.55), 120)
        later(() => setProgress(0.8), 900)
        later(() => setProgress(0.9), 2500)
      }, 150)
    } else if (phaseRef.current !== 'idle') {
      go('finishing')
      setProgress(1)
      later(() => {
        go('idle')
        setProgress(0)
      }, 300)
    }

    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
    }
  }, [busy])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 print:hidden">
      <div
        className={cn(
          'h-full origin-left bg-primary transition-[transform,opacity] ease-out',
          phase === 'idle' && 'opacity-0 duration-0',
          phase === 'running' && 'opacity-100 duration-500',
          phase === 'finishing' && 'opacity-0 duration-300',
        )}
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  )
}
