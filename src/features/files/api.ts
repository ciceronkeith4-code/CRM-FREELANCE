import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import { deleteAttachment, uploadAttachment } from '@/lib/storage'
import type { FileEntityType, FileRow } from '@/types/database'

export function useFiles(entityType: FileEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['files', entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId as string)
        .order('upload_date', { ascending: false })
      if (error) throw error
      return data as FileRow[]
    },
  })
}

export function useUploadFile(entityType: FileEntityType, entityId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string }) => {
      const path = await uploadAttachment(userId, `${entityType}s`, file)
      const { error } = await supabase.from('files').insert({
        entity_type: entityType,
        entity_id: entityId as string,
        name: file.name,
        storage_path: path,
      })
      if (error) {
        await deleteAttachment(path).catch(() => {})
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files', entityType, entityId] }),
  })
}

export function useDeleteFile(entityType: FileEntityType, entityId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: FileRow) => {
      // Remove the record first: a leftover storage object is harmless, a record pointing at nothing isn't.
      const { error } = await supabase.from('files').delete().eq('id', file.id)
      if (error) throw error
      await deleteAttachment(file.storage_path).catch(() => {})
    },
    ...optimisticRemove(queryClient, ['files', entityType, entityId], (file: FileRow) => file.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files', entityType, entityId] }),
  })
}
