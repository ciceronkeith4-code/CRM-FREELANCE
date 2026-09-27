import { useLayoutEffect, useState } from 'react'
import { Controller, useFieldArray, useWatch } from 'react-hook-form'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Money } from '@/components/shared/money'
import { round2 } from '@/lib/pricing'
import { duration, ease } from '@/lib/motion'

const MotionRow = motion.create(TableRow)

const rowMotion: Variants = {
  hidden: { opacity: 0, y: -4 },
  show: { opacity: 1, y: 0, transition: { duration: duration.overlay, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: duration.micro, ease: ease.in } },
}

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
  source_milestone_id?: string | null
  source_change_request_id?: string | null
}

export function lineTotal(item: Pick<LineItem, 'quantity' | 'unit_price'> | undefined) {
  return round2((Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0))
}

/** Drops blank rows, strips DB-only fields, and rounds every line to 2 decimals. */
export function normalizeLineItems(items: LineItem[] | undefined): LineItem[] {
  return (items ?? [])
    .filter((i) => i.description?.trim())
    .map((i) => ({
      description: i.description.trim(),
      quantity: Math.max(Number(i.quantity) || 0, 0),
      unit_price: Math.max(Number(i.unit_price) || 0, 0),
      line_total: lineTotal({ quantity: Math.max(Number(i.quantity) || 0, 0), unit_price: Math.max(Number(i.unit_price) || 0, 0) }),
      source_milestone_id: i.source_milestone_id ?? null,
      source_change_request_id: i.source_change_request_id ?? null,
    }))
}

/** Subtotal = sum of already-rounded line totals, so it always matches the printed lines. */
export function subtotalOf(items: LineItem[] | undefined) {
  return round2((items ?? []).reduce((sum, i) => sum + lineTotal(i), 0))
}

// react-hook-form's array-path generics (and Control's contravariant `validate`
// callback) don't thread well through a reusable, form-agnostic component like
// this one, so it intentionally takes an untyped control and treats the field
// as `LineItem[]` internally. Each cell is a Controller (not useFieldArray.update)
// so typing never remounts the input and focus is kept.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LineItemsEditor({ control, name }: { control: any; name: string }) {
  const { fields, append, remove } = useFieldArray({ control, name })
  const rows = useWatch({ control, name }) as LineItem[] | undefined

  // A removed line leaves the form immediately (totals update at once). What fades
  // out is a read-only copy: an exiting row must never keep live Controllers bound
  // to `items.N`, or they could re-register the deleted line into the form values.
  const [ghost, setGhost] = useState<{ key: string; index: number; item: LineItem | undefined } | null>(null)
  useLayoutEffect(() => {
    // Swap in the copy for one commit, then drop it so AnimatePresence animates it out.
    if (ghost) setGhost(null)
  }, [ghost])

  const removeLine = (index: number, key: string) => {
    setGhost({ key, index, item: rows?.[index] })
    remove(index)
  }

  const rowElements = fields.map((field, index) => (
    // No `exit` on live rows: if they disappear any other way (e.g. the form is reset), they go instantly.
    <MotionRow key={field.id} layout="position" variants={rowMotion} initial="hidden" animate="show">
      <TableCell>
        <Controller
          control={control}
          name={`${name}.${index}.description`}
          render={({ field: f }) => (
            <Input {...f} value={f.value ?? ''} placeholder="Item description" aria-label={`Line ${index + 1} description`} />
          )}
        />
      </TableCell>
      <TableCell className="w-20">
        <Controller
          control={control}
          name={`${name}.${index}.quantity`}
          render={({ field: f }) => (
            <Input
              type="number"
              min="0"
              step="0.01"
              className="w-full min-w-16"
              aria-label={`Line ${index + 1} quantity`}
              value={f.value ?? ''}
              onChange={(e) => f.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={f.onBlur}
            />
          )}
        />
      </TableCell>
      <TableCell className="w-28">
        <Controller
          control={control}
          name={`${name}.${index}.unit_price`}
          render={({ field: f }) => (
            <Input
              type="number"
              min="0"
              step="0.01"
              className="w-full min-w-20"
              aria-label={`Line ${index + 1} unit price`}
              value={f.value ?? ''}
              onChange={(e) => f.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={f.onBlur}
            />
          )}
        />
      </TableCell>
      <TableCell className="text-right text-sm whitespace-nowrap">
        <Money amount={lineTotal(rows?.[index])} />
      </TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove line ${index + 1}`} onClick={() => removeLine(index, field.id)}>
          <Trash2 className="size-3.5" />
        </Button>
      </TableCell>
    </MotionRow>
  ))

  if (ghost) {
    rowElements.splice(
      Math.min(ghost.index, rowElements.length),
      0,
      <MotionRow key={ghost.key} layout="position" variants={rowMotion} initial="hidden" animate="show" exit="exit" aria-hidden>
        <TableCell>
          <Input readOnly tabIndex={-1} value={ghost.item?.description ?? ''} />
        </TableCell>
        <TableCell className="w-20">
          <Input readOnly tabIndex={-1} className="w-full min-w-16" value={ghost.item?.quantity ?? ''} />
        </TableCell>
        <TableCell className="w-28">
          <Input readOnly tabIndex={-1} className="w-full min-w-20" value={ghost.item?.unit_price ?? ''} />
        </TableCell>
        <TableCell className="text-right text-sm whitespace-nowrap">
          <Money amount={lineTotal(ghost.item)} />
        </TableCell>
        <TableCell />
      </MotionRow>,
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="min-w-0 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">Description</TableHead>
              <TableHead className="w-24">Qty</TableHead>
              <TableHead className="w-28">Unit price</TableHead>
              <TableHead className="w-28 text-right">Line total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* initial={false}: rows already there when the form opens don't animate. */}
            <AnimatePresence initial={false}>{rowElements}</AnimatePresence>
          </TableBody>
        </Table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => append({ description: '', quantity: 1, unit_price: 0, line_total: 0 })}
      >
        <Plus /> Add line item
      </Button>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLineItemsSubtotal(control: any, name: string): number {
  const rows = useWatch({ control, name }) as LineItem[] | undefined
  return subtotalOf(rows)
}
