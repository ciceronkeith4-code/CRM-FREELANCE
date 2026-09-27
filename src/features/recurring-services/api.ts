import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticPatch, optimisticRemove } from '@/lib/optimistic'
import type { RecurringServiceInsert, RecurringServiceRow, RecurringServiceUpdate } from '@/types/database'

export const recurringServicesKey = ['recurring_services'] as const

export interface RecurringServiceWithClient extends RecurringServiceRow {
  clients: { name: string } | null
  projects: { title: string } | null
}

export function useRecurringServices() {
  return useQuery({
    queryKey: recurringServicesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_services')
        .select('*, clients(name), projects(title)')
        .order('next_renewal_date')
      if (error) throw error
      return data as unknown as RecurringServiceWithClient[]
    },
  })
}

export function useCreateRecurringService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RecurringServiceInsert) => {
      const { error } = await supabase.from('recurring_services').insert(input)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringServicesKey }),
  })
}

export function useUpdateRecurringService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: RecurringServiceUpdate & { id: string }) => {
      const { error } = await supabase.from('recurring_services').update(patch).eq('id', id)
      if (error) throw error
    },
    ...optimisticPatch<RecurringServiceUpdate & { id: string }>(queryClient, recurringServicesKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringServicesKey }),
  })
}

export function useDeleteRecurringService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_services').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, recurringServicesKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringServicesKey }),
  })
}

export function useMarkRenewed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('mark_recurring_service_renewed', { p_id: id })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringServicesKey })
      queryClient.invalidateQueries()
    },
  })
}
