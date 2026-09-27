import { useEffect, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { duration, ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

const iconMotion = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: { duration: duration.micro, ease: ease.out } },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.1, ease: ease.in } },
}

/**
 * Small icon button that copies `value`. The tooltip reads "Copy <label>" on
 * hover and flips to "Copied!" (with a check icon) for a moment after clicking.
 */
export function CopyButton({ value, label = 'value', className }: { value: string; label?: string; className?: string }) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = async (e: MouseEvent) => {
    // Rows and cards are often clickable; copying shouldn't also open the record.
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      toast.error('Could not copy to the clipboard')
    }
  }

  return (
    <Tooltip open={copied || hovered} onOpenChange={setHovered}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={copied ? 'Copied' : `Copy ${label}`}
          onClick={copy}
          className={cn('relative shrink-0 text-muted-foreground hover:text-foreground print:hidden', className)}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {copied ? (
              <motion.span key="check" {...iconMotion} className="inline-flex text-emerald-600 dark:text-emerald-400">
                <Check />
              </motion.span>
            ) : (
              <motion.span key="copy" {...iconMotion} className="inline-flex">
                <Copy />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {copied ? 'Copied!' : `Copy ${label}`}
      </TooltipContent>
    </Tooltip>
  )
}
