import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { PaymentInsert, PaymentRow, PaymentUpdate } from '@/types/database'

export const paymentsKey = ['payments'] as const

export interface PaymentWithRelations extends PaymentRow {
  clients: { name: string } | null
  projects: { title: string } | null
  invoices: { number: string | null } | null
}

export function usePayments() {
  return useQuery({
    queryKey: paymentsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(name), projects(title), invoices(number)')
        .order('date_paid', { ascending: false })
      if (error) throw error
      return data as unknown as PaymentWithRelations[]
    },
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaymentInsert) => {
      const { data, error } = await supabase.from('payments').insert(input).select().single()
      if (error) throw error
      return data as PaymentRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKey })
      queryClient.invalidateQueries()
    },
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: PaymentUpdate & { id: string }) => {
      const { error } = await supabase.from('payments').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKey })
      queryClient.invalidateQueries()
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, paymentsKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKey })
      queryClient.invalidateQueries()
    },
  })
}
