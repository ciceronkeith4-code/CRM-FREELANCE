import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticPatch, optimisticRemove } from '@/lib/optimistic'
import type { TaskInsert, TaskRow } from '@/types/database'

export const tasksKey = ['tasks'] as const

export function useTasks() {
  return useQuery({
    queryKey: tasksKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').order('due_date')
      if (error) throw error
      return data as TaskRow[]
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TaskInsert) => {
      const { error } = await supabase.from('tasks').insert(input)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey }),
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from('tasks').update({ done }).eq('id', id)
      if (error) throw error
    },
    ...optimisticPatch<{ id: string; done: boolean }>(queryClient, tasksKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, tasksKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey }),
  })
}
