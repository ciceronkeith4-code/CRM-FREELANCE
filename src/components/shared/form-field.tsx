import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { reveal } from '@/lib/motion'

export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  children,
}: {
  label?: string
  htmlFor?: string
  error?: string
  description?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <Field data-invalid={!!error}>
      {label && (
        <FieldLabel htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </FieldLabel>
      )}
      {children}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {/* Errors slide/fade in under the field; the input border colour eases to red via CSS. */}
      <AnimatePresence initial={false}>
        {error && (
          <motion.div key="error" variants={reveal} initial="hidden" animate="show" exit="exit">
            <FieldError>{error}</FieldError>
          </motion.div>
        )}
      </AnimatePresence>
    </Field>
  )
}
