import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticPatch, optimisticRemove } from '@/lib/optimistic'
import type { MilestoneInsert, MilestoneRow, MilestoneUpdate } from '@/types/database'

function key(projectId: string | undefined) {
  return ['projects', projectId, 'milestones'] as const
}

export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: key(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId as string)
        .order('sort_order')
      if (error) throw error
      return data as MilestoneRow[]
    },
  })
}

export function useCreateMilestone(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<MilestoneInsert, 'project_id'>) => {
      const { error } = await supabase.from('milestones').insert({ ...input, project_id: projectId as string })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useGenerateStandardMilestones(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ basePrice, downpaymentPercent }: { basePrice: number; downpaymentPercent: number }) => {
      const downpayment = Math.round(basePrice * (downpaymentPercent / 100) * 100) / 100
      const remaining = basePrice - downpayment
      const midpoint = Math.round((remaining / 2) * 100) / 100
      const final = Math.round((remaining - midpoint) * 100) / 100
      const { error } = await supabase.from('milestones').insert([
        { project_id: projectId as string, title: 'Downpayment', amount: downpayment, status: 'Pending', sort_order: 0 },
        { project_id: projectId as string, title: 'Midpoint', amount: midpoint, status: 'Pending', sort_order: 1 },
        { project_id: projectId as string, title: 'Final Turnover', amount: final, status: 'Pending', sort_order: 2 },
      ])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useUpdateMilestone(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: MilestoneUpdate & { id: string }) => {
      const { error } = await supabase.from('milestones').update(patch).eq('id', id)
      if (error) throw error
    },
    ...optimisticPatch<MilestoneUpdate & { id: string }>(queryClient, key(projectId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useDeleteMilestone(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, key(projectId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(projectId) }),
  })
}
