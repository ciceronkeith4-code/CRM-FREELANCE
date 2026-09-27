import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { duration, ease } from '@/lib/motion'

/** How long the ✓ stays on the button after a successful save before the modal closes. */
const SUCCESS_HOLD_MS = 450

const labelMotion = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.micro, ease: ease.out } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1, ease: ease.in } },
}

// Centered modal (not a side panel) so forms with wide content — like the
// line-items table on quotations/invoices — have real room instead of being
// squeezed into a narrow sidebar. Kept the name `FormSheet` since every
// create/edit form in the app already imports it under this name.
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitting = false,
  submitDisabled = false,
  dirty = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => void | Promise<void>
  submitLabel?: string
  submitting?: boolean
  submitDisabled?: boolean
  /** The form has unsaved edits: closing (or leaving the page) asks before discarding them. */
  dirty?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const formRef = useRef<HTMLFormElement>(null)

  // Covers the whole submit (file uploads included), not just the final mutation,
  // so a double-click can never create two records.
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const isSubmitting = busy || submitting

  // Forms close themselves when a save succeeds. A close that arrives while the
  // submit is still running is therefore a success: keep the modal up for a beat
  // and show a check on the button, then let it close.
  const [succeeded, setSucceeded] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    setSucceeded(!open && busy)
  }
  useEffect(() => {
    if (!succeeded) return
    const t = window.setTimeout(() => setSucceeded(false), SUCCESS_HOLD_MS)
    return () => window.clearTimeout(t)
  }, [succeeded])

  // Parents often clear the record being edited as soon as the form closes; keep
  // the heading as it was ("Edit payment", not "Record payment") while it animates out.
  const [heading, setHeading] = useState({ title, description, submitLabel })
  if (open && (heading.title !== title || heading.description !== description || heading.submitLabel !== submitLabel)) {
    setHeading({ title, description, submitLabel })
  }
  const shown = open ? { title, description, submitLabel } : heading

  const [confirmDiscard, setConfirmDiscard] = useState(false)
  /** An in-app navigation (e.g. browser Back) held until the discard prompt is answered. */
  const pendingLeave = useRef<PendingLeave | null>(null)
  const guardActive = open && dirty && !isSubmitting && !succeeded

  // Refreshing or closing the tab with unsaved edits gets the browser's own prompt.
  useEffect(() => {
    if (!guardActive) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [guardActive])

  const requestClose = () => {
    if (succeeded) setSucceeded(false)
    else if (guardActive) setConfirmDiscard(true)
    else onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      await onSubmit()
    } finally {
      // Give a close triggered by a successful save time to render while we're
      // still "busy" (that's how it's recognised as a success, above).
      await new Promise((resolve) => window.setTimeout(resolve, 50))
      inFlight.current = false
      setBusy(false)
    }
    revealFirstInvalidField()
  }

  /** After a rejected submit, bring the first field with an error into view and focus it. */
  const revealFirstInvalidField = () => {
    const field = formRef.current?.querySelector<HTMLElement>('[data-slot="field"][data-invalid="true"]')
    if (!field) return
    // react-hook-form already focuses plain inputs; this covers selects/comboboxes it can't reach.
    if (field.contains(document.activeElement)) return
    field.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
    field
      .querySelector<HTMLElement>('input:not([type="hidden"]), textarea, select, button, [tabindex]:not([tabindex="-1"])')
      ?.focus({ preventScroll: true })
  }

  const buttonState = succeeded ? 'done' : isSubmitting ? 'saving' : 'idle'

  return (
    <>
      <Dialog
        open={open || succeeded}
        onOpenChange={(next) => {
          if (!next) requestClose()
        }}
      >
        <DialogContent className="flex max-h-[85dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-4">
            <DialogTitle>{shown.title}</DialogTitle>
            {shown.description && <DialogDescription>{shown.description}</DialogDescription>}
          </DialogHeader>
          <ScrollArea className="min-h-0 flex-1 px-4">
            <form
              ref={formRef}
              id="form-sheet-form"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSubmit()
              }}
              className="flex min-w-0 flex-col gap-5 pt-4 pb-8"
            >
              {children}
            </form>
          </ScrollArea>
          <DialogFooter className="relative z-10 m-0 flex-row justify-end gap-2 border-t bg-popover p-4 shadow-[0_-4px_6px_-4px_rgb(0,0,0,0.1)]">
            <Button type="button" variant="outline" disabled={succeeded} onClick={requestClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="form-sheet-form"
              disabled={isSubmitting || succeeded || submitDisabled}
              aria-live="polite"
              className="min-w-24"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={buttonState} {...labelMotion} className="inline-flex items-center gap-1.5">
                  {buttonState === 'done' ? (
                    <>
                      <Check /> Saved
                    </>
                  ) : buttonState === 'saving' ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : (
                    shown.submitLabel
                  )}
                </motion.span>
              </AnimatePresence>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {guardActive && (
        <LeaveGuard
          onBlocked={(leave) => {
            pendingLeave.current = leave
            setConfirmDiscard(true)
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={(o) => {
          setConfirmDiscard(o)
          if (!o) pendingLeave.current?.reset()
        }}
        title="Discard changes?"
        description="You have unsaved changes in this form. If you leave now they'll be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          const leave = pendingLeave.current
          pendingLeave.current = null
          onOpenChange(false)
          leave?.proceed()
        }}
      />
    </>
  )
}

type PendingLeave = { proceed: () => void; reset: () => void }

/**
 * Holds in-app navigation while a dirty form is open. Mounted only then, because
 * React Router supports a single active blocker and many forms stay mounted closed.
 */
function LeaveGuard({ onBlocked }: { onBlocked: (leave: PendingLeave) => void }) {
  const blocker = useBlocker(true)
  const onBlockedRef = useRef(onBlocked)
  useEffect(() => {
    onBlockedRef.current = onBlocked
  })
  useEffect(() => {
    if (blocker.state === 'blocked') onBlockedRef.current({ proceed: blocker.proceed, reset: blocker.reset })
  }, [blocker])
  return null
}
