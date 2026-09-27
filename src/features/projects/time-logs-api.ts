import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { ChangeRequestRow, TimeLogInsert, TimeLogRow } from '@/types/database'

function key(projectId: string | undefined) {
  return ['projects', projectId, 'time_logs'] as const
}

export function useTimeLogs(projectId: string | undefined) {
  return useQuery({
    queryKey: key(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*, change_requests(title)')
        .eq('project_id', projectId as string)
        .order('date', { ascending: false })
      if (error) throw error
      return data as unknown as (TimeLogRow & { change_requests: Pick<ChangeRequestRow, 'title'> | null })[]
    },
  })
}

export function useCreateTimeLog(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<TimeLogInsert, 'project_id'>) => {
      const { error } = await supabase.from('time_logs').insert({ ...input, project_id: projectId as string })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(projectId) })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'totals'] })
    },
  })
}

export function useDeleteTimeLog(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_logs').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, key(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(projectId) })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'totals'] })
    },
  })
}
