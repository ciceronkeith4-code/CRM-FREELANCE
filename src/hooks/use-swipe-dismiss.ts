import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'

const DISMISS_DISTANCE = 72 // px
const DISMISS_VELOCITY = 0.45 // px per ms (a quick flick)

/**
 * Swipe a drawer/slide-over back toward the edge it came from to close it.
 * The panel follows the finger with a transform (no layout), springs back if
 * released early, and hands off to the normal close animation otherwise —
 * which starts from wherever the finger let go.
 */
export function useSwipeDismiss({
  open,
  side,
  onDismiss,
}: {
  open: boolean
  side: 'left' | 'right'
  onDismiss: () => void
}) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; t: number; locked: 'x' | 'y' | null } | null>(null)

  // Fresh position every time the panel opens (before first paint, so no jump).
  useLayoutEffect(() => {
    if (open) setOffset(0)
  }, [open])

  const direction = side === 'left' ? -1 : 1

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, t: performance.now(), locked: null }
  }, [])

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      const s = start.current
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      // Decide once whether this gesture is a horizontal swipe or a vertical scroll.
      if (!s.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        s.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (s.locked === 'x') setDragging(true)
      }
      if (s.locked !== 'x') return
      // Only follow the finger toward the closing edge; resist the other way.
      const toward = dx * direction
      setOffset(toward > 0 ? dx : dx * 0.15)
    },
    [direction],
  )

  const onTouchEnd = useCallback(() => {
    const s = start.current
    start.current = null
    if (!s || s.locked !== 'x') return
    setDragging(false)
    const distance = offset * direction
    const velocity = distance / Math.max(performance.now() - s.t, 1)
    if (distance > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      onDismiss()
    } else {
      setOffset(0)
    }
  }, [direction, offset, onDismiss])

  const style: CSSProperties =
    offset === 0 && !dragging
      ? {}
      : {
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: dragging ? 'none' : 'transform 220ms var(--ease-spring)',
        }

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd }, style }
}
