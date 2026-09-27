import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { QuotationInsert, QuotationLineItemRow, QuotationRow, QuotationUpdate } from '@/types/database'

export const quotationsKey = ['quotations'] as const

export interface QuotationWithClient extends QuotationRow {
  clients: { name: string } | null
  leads: { name: string } | null
}

export function useQuotations() {
  return useQuery({
    queryKey: quotationsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*, clients(name), leads(name)')
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data as unknown as QuotationWithClient[]
    },
  })
}

const quotationQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['quotations', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: quotation, error } = await supabase
        .from('quotations')
        .select('*, clients(name, email, phone, address), leads(name, email, phone)')
        .eq('id', id as string)
        .single()
      if (error) throw error
      const { data: items, error: itemsError } = await supabase
        .from('quotation_line_items')
        .select('*')
        .eq('quotation_id', id as string)
        .order('sort_order')
      if (itemsError) throw itemsError
      return { ...quotation, line_items: items as QuotationLineItemRow[] } as unknown as QuotationRow & {
        line_items: QuotationLineItemRow[]
        clients: { name: string; email: string | null; phone: string | null; address: string | null } | null
        leads: { name: string; email: string | null; phone: string | null } | null
      }
    },
  })

export function useQuotation(id: string | undefined) {
  return useQuery(quotationQuery(id))
}

/** Warm the quotation detail page's queries on hover so the click renders instantly. */
export function prefetchQuotation(queryClient: QueryClient, id: string) {
  void queryClient.prefetchQuery(quotationQuery(id))
}

type LineItemInput = Pick<QuotationLineItemRow, 'description' | 'quantity' | 'unit_price' | 'line_total'>

export function useCreateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QuotationInsert & { line_items: LineItemInput[] }) => {
      const { line_items, ...quotationInput } = input
      const { data: quotation, error } = await supabase.from('quotations').insert(quotationInput).select().single()
      if (error) throw error
      const { error: itemsError } = await supabase.rpc('replace_quotation_line_items', {
        p_quotation_id: quotation.id,
        p_items: line_items,
      })
      if (itemsError) throw itemsError
      return quotation as QuotationRow
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKey }),
  })
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      line_items,
      ...patch
    }: QuotationUpdate & { id: string; line_items: LineItemInput[] }) => {
      const { error } = await supabase.from('quotations').update(patch).eq('id', id)
      if (error) throw error
      // Atomic delete + reinsert in one transaction, so a failed save never loses lines.
      const { error: itemsError } = await supabase.rpc('replace_quotation_line_items', {
        p_quotation_id: id,
        p_items: line_items,
      })
      if (itemsError) throw itemsError
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: quotationsKey })
      queryClient.invalidateQueries({ queryKey: ['quotations', vars.id] })
    },
  })
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotations').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, quotationsKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKey }),
  })
}

export function useConvertQuotationToProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (quotation: QuotationRow & { line_items: QuotationLineItemRow[]; clients?: { name: string } | null }) => {
      if (!quotation.client_id) {
        throw new Error('Convert the lead to a client first, then link this quotation to them.')
      }
      const description = quotation.line_items
        .map((item) => `${item.description} — ${item.quantity} x ${item.unit_price} = ${item.line_total}`)
        .join('\n')

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          client_id: quotation.client_id,
          title: quotation.title,
          description,
          base_price: quotation.total,
          quotation_id: quotation.id,
        })
        .select()
        .single()
      if (error) throw error

      const { error: updateError } = await supabase
        .from('quotations')
        .update({ status: 'Accepted', project_id: project.id })
        .eq('id', quotation.id)
      if (updateError) throw updateError

      return project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKey })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
