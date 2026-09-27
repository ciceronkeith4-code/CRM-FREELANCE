import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/auth-context'
import { getAttachmentUrl } from '@/lib/storage'
import type { BusinessSettingsRow, BusinessSettingsUpdate } from '@/types/database'

export const settingsKey = ['business_settings'] as const

export function useSettings() {
  const { user } = useAuth()
  return useQuery({
    queryKey: settingsKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('business_settings').select('*').maybeSingle()
      if (error) throw error
      if (data) return data as BusinessSettingsRow
      // Accounts created before the new-user trigger existed have no row yet.
      const { data: created, error: insertError } = await supabase
        .from('business_settings')
        .insert({ email: user?.email ?? null })
        .select()
        .single()
      if (insertError) throw insertError
      return created as BusinessSettingsRow
    },
  })
}

/** Short-lived signed URL for the (private) business logo. */
export function useLogoUrl() {
  const { data: settings } = useSettings()
  const path = settings?.logo_path
  return useQuery({
    queryKey: ['business_settings', 'logo', path],
    enabled: !!path,
    staleTime: 30 * 60_000,
    queryFn: () => getAttachmentUrl(path as string),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: BusinessSettingsUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('business_settings')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as BusinessSettingsRow
    },
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKey, data)
    },
  })
}

export function useSeedSampleData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seed_sample_data')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}

export function useClearSampleData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('clear_sample_data')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}
