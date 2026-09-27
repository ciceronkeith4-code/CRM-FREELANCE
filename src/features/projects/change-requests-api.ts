import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticPatch, optimisticRemove } from '@/lib/optimistic'
import type { ChangeRequestInsert, ChangeRequestRow, ChangeRequestUpdate } from '@/types/database'

function key(projectId: string | undefined) {
  return ['projects', projectId, 'change_requests'] as const
}

export function useChangeRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: key(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_requests')
        .select('*')
        .eq('project_id', projectId as string)
        .order('date_requested', { ascending: false })
      if (error) throw error
      return data as ChangeRequestRow[]
    },
  })
}

export function useCreateChangeRequest(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<ChangeRequestInsert, 'project_id'>) => {
      const { error } = await supabase.from('change_requests').insert({ ...input, project_id: projectId as string })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(projectId) })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'totals'] })
    },
  })
}

export function useUpdateChangeRequest(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: ChangeRequestUpdate & { id: string }) => {
      const { error } = await supabase.from('change_requests').update(patch).eq('id', id)
      if (error) throw error
    },
    ...optimisticPatch<ChangeRequestUpdate & { id: string }>(queryClient, key(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(projectId) })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'totals'] })
    },
  })
}

export function useDeleteChangeRequest(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('change_requests').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, key(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(projectId) })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'totals'] })
    },
  })
}
