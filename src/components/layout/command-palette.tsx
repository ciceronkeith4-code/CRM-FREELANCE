import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Users, FolderKanban, Receipt, FileText } from 'lucide-react'
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { useUiStore } from '@/stores/ui-store'
import { useGlobalSearch, type SearchResult } from '@/features/search/api'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const TYPE_ICON: Record<SearchResult['type'], typeof Target> = {
  lead: Target,
  client: Users,
  project: FolderKanban,
  invoice: Receipt,
  quotation: FileText,
}

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  lead: 'Leads',
  client: 'Clients',
  project: 'Projects',
  invoice: 'Invoices',
  quotation: 'Quotations',
}

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { data: results, isFetching } = useGlobalSearch(debouncedQuery)

  const ready = query.trim().length >= 2
  // Typing ahead of the debounce, or the request is in flight.
  const searching = ready && (isFetching || debouncedQuery !== query)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  const visible = ready ? (results ?? []) : []
  const grouped = visible.reduce<Record<string, SearchResult[]>>((acc, r) => {
    acc[r.type] = acc[r.type] ?? []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="data-open:slide-in-from-top-2">
      {/* Results are already filtered server-side, so cmdk's own fuzzy filter is off. */}
      <Command shouldFilter={false}>
        <div className="relative">
          <CommandInput
            placeholder="Search leads, clients, projects, invoices, quotations..."
            value={query}
            onValueChange={setQuery}
          />
          {searching && (
            <Spinner className="pointer-events-none absolute top-1/2 right-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
        <CommandList>
          {!ready && <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>}
          {/* Only say "no results" once the search has actually settled — no flicker while typing. */}
          {ready && !searching && visible.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
          {(Object.keys(grouped) as SearchResult['type'][]).map((type) => (
            <CommandGroup key={type} heading={TYPE_LABEL[type]}>
              {grouped[type].map((r) => {
                const Icon = TYPE_ICON[r.type]
                return (
                  <CommandItem
                    key={`${r.type}-${r.id}`}
                    value={`${r.type}-${r.id}`}
                    className="transition-colors duration-150"
                    onSelect={() => {
                      setOpen(false)
                      setQuery('')
                      navigate(r.path)
                    }}
                  >
                    <Icon />
                    <span>{r.title}</span>
                    {r.subtitle && <span className="truncate text-muted-foreground">{r.subtitle}</span>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
