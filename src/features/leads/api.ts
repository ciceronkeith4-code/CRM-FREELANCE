import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { LeadInsert, LeadRow, LeadStage, LeadUpdate } from '@/types/database'

export const leadsKey = ['leads'] as const

export function useLeads() {
  return useQuery({
    queryKey: leadsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as LeadRow[]
    },
  })
}

const leadQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['leads', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', id as string).single()
      if (error) throw error
      return data as LeadRow
    },
  })

export function useLead(id: string | undefined) {
  return useQuery(leadQuery(id))
}

/** Warm the lead detail page's queries on hover so the click renders instantly. */
export function prefetchLead(queryClient: QueryClient, id: string) {
  void queryClient.prefetchQuery(leadQuery(id))
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: LeadInsert) => {
      const { data, error } = await supabase.from('leads').insert(input).select().single()
      if (error) throw error
      return data as LeadRow
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKey }),
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase.from('leads').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as LeadRow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: leadsKey })
      queryClient.invalidateQueries({ queryKey: ['leads', data.id] })
    },
  })
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: LeadStage }) => {
      const { error } = await supabase.from('leads').update({ stage }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: leadsKey })
      const previous = queryClient.getQueryData<LeadRow[]>(leadsKey)
      queryClient.setQueryData<LeadRow[]>(leadsKey, (old) =>
        old?.map((l) => (l.id === id ? { ...l, stage } : l)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(leadsKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: leadsKey }),
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, leadsKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKey }),
  })
}

export function useConvertLeadToClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lead: LeadRow) => {
      // A lead that was converted before (then moved back to another stage) reuses its client.
      const { data: existing, error: existingError } = await supabase
        .from('clients')
        .select('*')
        .eq('lead_id', lead.id)
        .limit(1)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) {
        const { error: leadError } = await supabase.from('leads').update({ stage: 'Won' }).eq('id', lead.id)
        if (leadError) throw leadError
        return existing
      }

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: lead.name,
          company: lead.company,
          business_type: lead.business_type,
          email: lead.email,
          phone: lead.phone,
          preferred_contact: lead.preferred_contact,
          social_link: lead.social_link,
          source: lead.source,
          lead_id: lead.id,
          notes: lead.notes,
        })
        .select()
        .single()
      if (clientError) throw clientError

      const { error: leadError } = await supabase.from('leads').update({ stage: 'Won' }).eq('id', lead.id)
      if (leadError) throw leadError

      return client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKey })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
