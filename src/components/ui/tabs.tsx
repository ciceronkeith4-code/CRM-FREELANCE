"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"
import { spring } from "@/lib/motion"

/** Active value + a per-instance id, so the active pill can slide between triggers. */
const TabsStateContext = React.createContext<{ id: string; value: string | undefined } | null>(null)
const TabsListVariantContext = React.createContext<"default" | "line" | null | undefined>("default")

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const id = React.useId()
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const current = value ?? uncontrolled
  const state = React.useMemo(() => ({ id, value: current }), [id, current])

  return (
    <TabsStateContext.Provider value={state}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          setUncontrolled(next)
          onValueChange?.(next)
        }}
        className={cn(
          "group/tabs flex gap-2 data-horizontal:flex-col",
          className
        )}
        {...props}
      />
    </TabsStateContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsListVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </TabsListVariantContext.Provider>
  )
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const state = React.useContext(TabsStateContext)
  const variant = React.useContext(TabsListVariantContext)
  // The "default" (pill) variant draws its active background as a shared-layout
  // element that glides to the newly selected trigger. "line" keeps its CSS underline.
  const showPill = variant !== "line" && state !== null && state.value === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative isolate inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-[color,box-shadow] duration-150 ease-out group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-active:text-foreground dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    >
      {showPill && (
        <motion.span
          aria-hidden
          layoutId={`${state.id}-tab-pill`}
          transition={spring.snappy}
          className="absolute -inset-px -z-10 rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-input/30"
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      // Inactive panels unmount, so fading the incoming one in reads as a quick cross-fade.
      className={cn("flex-1 text-sm outline-none animate-in fade-in-0 duration-200 ease-out", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
