import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { ProjectAccessInfoInsert, ProjectAccessInfoRow } from '@/types/database'

function key(projectId: string | undefined) {
  return ['projects', projectId, 'access_info'] as const
}

export function useAccessInfo(projectId: string | undefined) {
  return useQuery({
    queryKey: key(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_access_info')
        .select('*')
        .eq('project_id', projectId as string)
        .order('created_at')
      if (error) throw error
      return data as ProjectAccessInfoRow[]
    },
  })
}

export function useCreateAccessInfo(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<ProjectAccessInfoInsert, 'project_id'>) => {
      const { error } = await supabase.from('project_access_info').insert({ ...input, project_id: projectId as string })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useDeleteAccessInfo(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_access_info').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, key(projectId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(projectId) }),
  })
}
