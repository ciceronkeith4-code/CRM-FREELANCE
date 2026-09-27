import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SearchResult {
  id: string
  type: 'lead' | 'client' | 'project' | 'invoice' | 'quotation'
  title: string
  subtitle?: string
  path: string
}

export function useGlobalSearch(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['global-search', trimmed],
    enabled: trimmed.length >= 2,
    // Keep showing the last results while the next search loads (no flash to empty).
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const like = `%${trimmed}%`
      const [leads, clients, projects, invoices, quotations] = await Promise.all([
        supabase.from('leads').select('id, name, company').ilike('name', like).limit(5),
        supabase.from('clients').select('id, name, company').ilike('name', like).limit(5),
        supabase.from('projects').select('id, title').ilike('title', like).limit(5),
        supabase.from('invoices').select('id, number').ilike('number', like).limit(5),
        supabase.from('quotations').select('id, number, title').ilike('title', like).limit(5),
      ])

      const results: SearchResult[] = []
      for (const l of leads.data ?? []) {
        results.push({ id: l.id, type: 'lead', title: l.name, subtitle: l.company ?? undefined, path: `/leads/${l.id}` })
      }
      for (const c of clients.data ?? []) {
        results.push({ id: c.id, type: 'client', title: c.name, subtitle: c.company ?? undefined, path: `/clients/${c.id}` })
      }
      for (const p of projects.data ?? []) {
        results.push({ id: p.id, type: 'project', title: p.title, path: `/projects/${p.id}` })
      }
      for (const i of invoices.data ?? []) {
        results.push({ id: i.id, type: 'invoice', title: i.number ?? 'Invoice', path: `/invoices/${i.id}` })
      }
      for (const q of quotations.data ?? []) {
        results.push({ id: q.id, type: 'quotation', title: q.number ?? q.title, subtitle: q.title, path: `/quotations/${q.id}` })
      }
      return results
    },
  })
}
