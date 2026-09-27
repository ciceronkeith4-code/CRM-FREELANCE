import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { AnimatePresence, motion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { duration, ease } from '@/lib/motion'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <Button variant="ghost" size="icon" aria-label="Toggle theme" />

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          className="flex"
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: duration.micro, ease: ease.out }}
        >
          {isDark ? <Sun /> : <Moon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}
