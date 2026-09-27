import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { InvoiceComputedRow, InvoiceInsert, InvoiceLineItemRow, InvoiceRow, InvoiceUpdate } from '@/types/database'

export const invoicesKey = ['invoices'] as const

export interface InvoiceWithClient extends InvoiceComputedRow {
  clients: { name: string } | null
  projects: { title: string } | null
}

export function useInvoices() {
  return useQuery({
    queryKey: invoicesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_invoices_computed')
        .select('*, clients(name), projects(title)')
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data as unknown as InvoiceWithClient[]
    },
  })
}

const invoiceQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['invoices', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: invoice, error } = await supabase
        .from('view_invoices_computed')
        .select('*, clients(name, email, phone, address), projects(title)')
        .eq('id', id as string)
        .single()
      if (error) throw error
      const { data: items, error: itemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', id as string)
        .order('sort_order')
      if (itemsError) throw itemsError
      return { ...invoice, line_items: items as InvoiceLineItemRow[] } as unknown as InvoiceComputedRow & {
        line_items: InvoiceLineItemRow[]
        clients: { name: string; email: string | null; phone: string | null; address: string | null } | null
        projects: { title: string } | null
      }
    },
  })

export function useInvoice(id: string | undefined) {
  return useQuery(invoiceQuery(id))
}

/** Warm the invoice detail page's queries on hover so the click renders instantly. */
export function prefetchInvoice(queryClient: QueryClient, id: string) {
  void queryClient.prefetchQuery(invoiceQuery(id))
}

type LineItemInput = Pick<InvoiceLineItemRow, 'description' | 'quantity' | 'unit_price' | 'line_total'> &
  Partial<Pick<InvoiceLineItemRow, 'source_milestone_id' | 'source_change_request_id'>>

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: InvoiceInsert & { line_items: LineItemInput[] }) => {
      const { line_items, ...invoiceInput } = input
      const { data: invoice, error } = await supabase.from('invoices').insert(invoiceInput).select().single()
      if (error) throw error
      // Milestone "Invoiced"/"Pending" status is kept in sync by a DB trigger on line items.
      const { error: itemsError } = await supabase.rpc('replace_invoice_line_items', {
        p_invoice_id: invoice.id,
        p_items: line_items,
      })
      if (itemsError) throw itemsError
      return invoice as InvoiceRow
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoicesKey }),
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, line_items, ...patch }: InvoiceUpdate & { id: string; line_items: LineItemInput[] }) => {
      const { error } = await supabase.from('invoices').update(patch).eq('id', id)
      if (error) throw error
      // Atomic delete + reinsert in one transaction, so a failed save never loses lines.
      const { error: itemsError } = await supabase.rpc('replace_invoice_line_items', {
        p_invoice_id: id,
        p_items: line_items,
      })
      if (itemsError) throw itemsError
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: invoicesKey })
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.id] })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, invoicesKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoicesKey }),
  })
}

export function useUnbilledMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'unbilled_milestones'],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId as string)
        .eq('status', 'Pending')
      if (error) throw error
      return data
    },
  })
}

export function useUnbilledChangeRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'unbilled_change_requests'],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: candidates, error } = await supabase
        .from('change_requests')
        .select('*')
        .eq('project_id', projectId as string)
        .in('status', ['Approved', 'In Progress', 'Done'])
        .gt('extra_charge', 0)
      if (error) throw error

      const { data: invoiceIds } = await supabase.from('invoices').select('id').eq('project_id', projectId as string)
      const ids = (invoiceIds ?? []).map((i) => i.id)
      if (ids.length === 0 || candidates.length === 0) return candidates

      const { data: billedItems } = await supabase
        .from('invoice_line_items')
        .select('source_change_request_id')
        .in('invoice_id', ids)
        .not('source_change_request_id', 'is', null)
      const billedIds = new Set((billedItems ?? []).map((i) => i.source_change_request_id))

      return candidates.filter((c) => !billedIds.has(c.id))
    },
  })
}
