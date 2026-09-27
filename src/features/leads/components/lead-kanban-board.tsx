import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import { isPast, isToday, parseISO } from 'date-fns'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { cn } from '@/lib/utils'
import { duration, ease, spring } from '@/lib/motion'
import { prefetchLead, useUpdateLeadStage } from '@/features/leads/api'
import type { LeadRow, LeadStage } from '@/types/database'

const STAGES: LeadStage[] = ['New', 'Contacted', 'Interested', 'Proposal Sent', 'Negotiating', 'Won', 'Lost']
// Keep columns scannable when a stage has a lot of leads — show a capped
// number by default and let the person expand a single column on demand.
// While actively searching, the cap is lifted everywhere (see LeadKanbanBoard).
const CARD_CAP = 8
/** Past this many cards in a column, skip reflow animations to keep dragging smooth. */
const LAYOUT_ANIMATION_LIMIT = 40

function isOverdue(lead: LeadRow) {
  return !!lead.next_follow_up_date && isPast(parseISO(lead.next_follow_up_date)) && !isToday(parseISO(lead.next_follow_up_date))
}

function LeadCardBody({ lead }: { lead: LeadRow }) {
  const overdue = isOverdue(lead)
  return (
    <CardContent className="flex flex-col gap-1.5 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{lead.name}</span>
        {overdue && <AlertCircle className="size-4 shrink-0 text-red-500" />}
      </div>
      {lead.company && <span className="text-xs text-muted-foreground">{lead.company}</span>}
      {lead.estimated_value != null && <Money amount={lead.estimated_value} className="text-sm font-medium" />}
      {lead.next_follow_up_date && (
        <span className={cn('text-xs', overdue ? 'font-medium text-red-500' : 'text-muted-foreground')}>
          Follow up <DateText date={lead.next_follow_up_date} />
        </span>
      )}
    </CardContent>
  )
}

function DraggableLeadCard({ lead, onClick, onHover }: { lead: LeadRow; onClick: () => void; onHover: () => void }) {
  // The DragOverlay renders the moving copy; the original stays behind as a faded ghost.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })
  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
      onMouseEnter={onHover}
      className={cn(
        'cursor-grab touch-none select-none outline-none transition-[opacity,background-color] duration-150 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      <LeadCardBody lead={lead} />
    </Card>
  )
}

function KanbanColumn({
  stage,
  leads,
  placeholderIndex,
  expanded,
  onToggleExpand,
  onCardClick,
  onCardHover,
}: {
  stage: LeadStage
  leads: LeadRow[]
  /** Where the dragged card would slot in, or null when it isn't over this column. */
  placeholderIndex: number | null
  expanded: boolean
  onToggleExpand: () => void
  onCardClick: (lead: LeadRow) => void
  onCardHover: (lead: LeadRow) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const { active } = useDndContext()
  const total = leads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)
  const visible = expanded ? leads : leads.slice(0, CARD_CAP)
  const hiddenCount = leads.length - visible.length
  const layout = visible.length <= LAYOUT_ANIMATION_LIMIT ? ('position' as const) : false
  const slot = placeholderIndex === null ? -1 : Math.min(placeholderIndex, visible.length)

  const items = visible.map((lead) => (
    <motion.div
      key={lead.id}
      layout={layout}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: duration.overlay, ease: ease.out } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: duration.micro, ease: ease.in } }}
      transition={spring.snappy}
    >
      <DraggableLeadCard lead={lead} onClick={() => onCardClick(lead)} onHover={() => onCardHover(lead)} />
    </motion.div>
  ))
  if (slot >= 0) {
    // Dashed slot where the dragged card will land, sized like the card being dragged.
    items.splice(
      slot,
      0,
      <motion.div
        key="__placeholder"
        layout="position"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: duration.micro, ease: ease.out } }}
        exit={{ opacity: 0, transition: { duration: 0.1, ease: ease.in } }}
        transition={spring.snappy}
        style={{ height: active?.rect.current.initial?.height ?? 72 }}
        className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5"
      />,
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2 transition-colors duration-150',
        isOver && 'bg-primary/5 ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-center justify-between px-1 text-sm font-medium">
        <span>{stage}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{leads.length}</span>
      </div>
      {total > 0 && (
        <div className="px-1 text-xs text-muted-foreground">
          <Money amount={total} />
        </div>
      )}
      <div className="relative flex flex-col gap-2">
        {/* initial={false}: no pop-in on page load (the page itself fades in); only real moves animate. */}
        <AnimatePresence initial={false} mode="popLayout">
          {items}
        </AnimatePresence>
      </div>
      {hiddenCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full justify-center text-muted-foreground" onClick={onToggleExpand}>
          <ChevronDown className="size-3.5" /> Show {hiddenCount} more
        </Button>
      )}
    </div>
  )
}

export function LeadKanbanBoard({
  leads,
  isSearching = false,
  onCardClick,
}: {
  leads: LeadRow[]
  isSearching?: boolean
  onCardClick: (lead: LeadRow) => void
}) {
  const queryClient = useQueryClient()
  const updateStage = useUpdateLeadStage()
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null)
  const [overStage, setOverStage] = useState<LeadStage | null>(null)
  const [expandedStages, setExpandedStages] = useState<Set<LeadStage>>(new Set())
  // Applied in the same render as the drop, so the card never flashes back to its
  // old column before the (async) optimistic cache update lands. Cleared once the
  // mutation settles — the cache is authoritative again (including a rollback).
  const [pendingMove, setPendingMove] = useState<{ id: string; stage: LeadStage } | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const boardLeads = useMemo(
    () => (pendingMove ? leads.map((l) => (l.id === pendingMove.id ? { ...l, stage: pendingMove.stage } : l)) : leads),
    [leads, pendingMove],
  )

  const toggleExpand = (stage: LeadStage) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const lead = boardLeads.find((l) => l.id === event.active.id)
    setActiveLead(lead ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null)
    setOverStage(null)
    const { active, over } = event
    if (!over) return
    const newStage = over.id as LeadStage
    const lead = boardLeads.find((l) => l.id === active.id)
    if (lead && lead.stage !== newStage) {
      setPendingMove({ id: lead.id, stage: newStage })
      updateStage.mutate({ id: lead.id, stage: newStage }, { onSettled: () => setPendingMove(null) })
    }
  }

  /** Index the dragged lead will occupy in the target column (lists keep their existing order). */
  const placeholderIndexFor = (stage: LeadStage) => {
    if (!activeLead || overStage !== stage || activeLead.stage === stage) return null
    const withActive = boardLeads.filter((l) => l.stage === stage || l.id === activeLead.id)
    return withActive.findIndex((l) => l.id === activeLead.id)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={(e) => setOverStage((e.over?.id as LeadStage | undefined) ?? null)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveLead(null)
        setOverStage(null)
      }}
    >
      <div className="scroll-x-smooth flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={boardLeads.filter((l) => l.stage === stage)}
            placeholderIndex={placeholderIndexFor(stage)}
            expanded={isSearching || expandedStages.has(stage)}
            onToggleExpand={() => toggleExpand(stage)}
            onCardClick={onCardClick}
            onCardHover={(lead) => prefetchLead(queryClient, lead.id)}
          />
        ))}
      </div>
      {/* No drop animation: the card is already placed optimistically in its new column. */}
      <DragOverlay dropAnimation={null}>
        {activeLead && (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ scale: 1.03, rotate: 2 }}
            transition={spring.snappy}
            className="cursor-grabbing"
          >
            <Card className="shadow-xl ring-1 ring-primary/20">
              <LeadCardBody lead={activeLead} />
            </Card>
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
