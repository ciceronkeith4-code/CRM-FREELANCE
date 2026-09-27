import { supabase, ATTACHMENTS_BUCKET } from '@/lib/supabase'

export async function uploadAttachment(userId: string, category: string, file: File): Promise<string> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${category}/${Date.now()}-${cleanName}`
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

export async function deleteAttachment(path: string): Promise<void> {
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path])
  if (error) throw error
}
