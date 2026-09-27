import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { ClientInsert, ClientRow, ClientTotalsRow, ClientUpdate } from '@/types/database'

export const clientsKey = ['clients'] as const

export function useClients() {
  return useQuery({
    queryKey: clientsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('name')
      if (error) throw error
      return data as ClientRow[]
    },
  })
}

const clientQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['clients', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id as string).single()
      if (error) throw error
      return data as ClientRow
    },
  })

export function useClient(id: string | undefined) {
  return useQuery(clientQuery(id))
}

const clientTotalsQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['clients', id, 'totals'],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('view_client_totals').select('*').eq('client_id', id as string).single()
      if (error) throw error
      return data as ClientTotalsRow
    },
  })

export function useClientTotals(id: string | undefined) {
  return useQuery(clientTotalsQuery(id))
}

/** Warm the client detail page's queries on hover so the click renders instantly. */
export function prefetchClient(queryClient: QueryClient, id: string) {
  void queryClient.prefetchQuery(clientQuery(id))
  void queryClient.prefetchQuery(clientTotalsQuery(id))
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClientInsert) => {
      const { data, error } = await supabase.from('clients').insert(input).select().single()
      if (error) throw error
      return data as ClientRow
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase.from('clients').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as ClientRow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientsKey })
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, clientsKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
  })
}
