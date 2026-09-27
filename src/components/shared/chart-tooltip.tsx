import type { TooltipContentProps } from 'recharts'

/** Tooltip body styled like the app's popovers; mounts on hover, so it fades in. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  format,
}: Partial<TooltipContentProps<number, string>> & { format: (value: unknown) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="animate-in rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md duration-150 fade-in-0 zoom-in-95">
      {label != null && label !== '' && <p className="mb-1 font-medium">{label}</p>}
      <div className="flex flex-col gap-0.5">
        {payload.map((entry, i) => (
          <div key={`${String(entry.dataKey ?? entry.name)}-${i}`} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: entry.color ?? (entry.payload as { fill?: string } | undefined)?.fill }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{format(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
