import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { ActivityRow, EntityType } from '@/types/database'

export function useActivities(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['activities', entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId as string)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ActivityRow[]
    },
  })
}

export function useCreateActivity(entityType: EntityType, entityId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<ActivityRow, 'type' | 'date' | 'content'>) => {
      const { error } = await supabase.from('activities').insert({
        entity_type: entityType,
        entity_id: entityId as string,
        ...input,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] })
    },
  })
}

export function useDeleteActivity(entityType: EntityType, entityId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, ['activities', entityType, entityId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] })
    },
  })
}
