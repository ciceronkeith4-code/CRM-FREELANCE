import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticPatch, optimisticRemove } from '@/lib/optimistic'
import type { ExpenseInsert, ExpenseRow, ExpenseUpdate } from '@/types/database'

export const expensesKey = ['expenses'] as const

export interface ExpenseWithRelations extends ExpenseRow {
  clients: { name: string } | null
  projects: { title: string } | null
}

export function useExpenses() {
  return useQuery({
    queryKey: expensesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, clients(name), projects(title)')
        .order('date', { ascending: false })
      if (error) throw error
      return data as unknown as ExpenseWithRelations[]
    },
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ExpenseInsert) => {
      const { error } = await supabase.from('expenses').insert(input)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesKey }),
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: ExpenseUpdate & { id: string }) => {
      const { error } = await supabase.from('expenses').update(patch).eq('id', id)
      if (error) throw error
    },
    ...optimisticPatch<ExpenseUpdate & { id: string }>(queryClient, expensesKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesKey }),
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, expensesKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expensesKey }),
  })
}
