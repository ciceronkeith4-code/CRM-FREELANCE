import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { ProjectComputedRow, ProjectInsert, ProjectRow, ProjectUpdate } from '@/types/database'

export const projectsKey = ['projects'] as const

export interface ProjectWithClientAndTotals extends ProjectRow {
  clients: { name: string } | null
  totals?: ProjectComputedRow
}

export function useProjects() {
  return useQuery({
    queryKey: projectsKey,
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      const ids = projects.map((p) => p.id)
      const { data: totals, error: totalsError } = await supabase
        .from('view_project_computed')
        .select('*')
        .in('project_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      if (totalsError) throw totalsError
      const totalsMap = new Map((totals ?? []).map((t) => [t.project_id, t]))
      return projects.map((p) => ({ ...p, totals: totalsMap.get(p.id) })) as unknown as ProjectWithClientAndTotals[]
    },
  })
}

const projectQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['projects', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*, clients(name, email, phone)')
        .eq('id', id as string)
        .single()
      if (error) throw error
      return project as unknown as ProjectWithClientAndTotals
    },
  })

const projectTotalsQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['projects', id, 'totals'],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('view_project_computed').select('*').eq('project_id', id as string).single()
      if (error) throw error
      return data as ProjectComputedRow
    },
  })

export function useProject(id: string | undefined) {
  return useQuery(projectQuery(id))
}

export function useProjectTotals(id: string | undefined) {
  return useQuery(projectTotalsQuery(id))
}

/** Warm the detail page's queries on hover so the click renders instantly. */
export function prefetchProject(queryClient: QueryClient, id: string) {
  void queryClient.prefetchQuery(projectQuery(id))
  void queryClient.prefetchQuery(projectTotalsQuery(id))
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProjectInsert) => {
      const { data, error } = await supabase.from('projects').insert(input).select().single()
      if (error) throw error
      return data as ProjectRow
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: ProjectUpdate & { id: string }) => {
      const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as ProjectRow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKey })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id, 'totals'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, projectsKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  })
}
