import { useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { FileRow } from '@/types/database'
import { toast } from 'sonner'
import { FileIcon, Trash2, Upload, ExternalLink } from 'lucide-react'
import { useFiles, useUploadFile, useDeleteFile } from '@/features/files/api'
import { useAuth } from '@/features/auth/auth-context'
import { getAttachmentUrl } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/shared/date-text'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { FileEntityType } from '@/types/database'
import { toastError } from '@/lib/errors'

export function FilesTab({ entityType, entityId }: { entityType: FileEntityType; entityId: string | undefined }) {
  const { data: files, isLoading } = useFiles(entityType, entityId)
  const uploadFile = useUploadFile(entityType, entityId)
  const deleteFile = useDeleteFile(entityType, entityId)
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingDelete, setPendingDelete] = useState<FileRow | null>(null)

  const handleUpload = async (file: File | undefined) => {
    if (!file || !user) return
    try {
      await uploadFile.mutateAsync({ file, userId: user.id })
      toast.success('File uploaded')
    } catch (err) {
      toastError(err, 'Upload failed')
    }
  }

  const handleView = async (path: string) => {
    try {
      const url = await getAttachmentUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not open file')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            void handleUpload(e.target.files?.[0])
            e.target.value = '' // allow re-selecting the same file
          }}
        />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploadFile.isPending}>
          <Upload /> Upload file
        </Button>
      </div>

      {isLoading && <Skeleton className="h-10 w-full" />}

      {!isLoading && files?.length === 0 && (
        <EmptyState icon={FileIcon} title="No files yet" description="Contracts, signed quotes, briefs, and screenshots go here." />
      )}

      <div className="flex flex-col gap-1.5">
        {files?.map((f) => (
          <div key={f.id} className="group flex items-center gap-2 rounded-md border p-2 text-sm">
            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
            <button type="button" onClick={() => handleView(f.storage_path)} className="flex-1 truncate text-left hover:underline">
              {f.name}
            </button>
            <DateText date={f.upload_date} className="text-xs text-muted-foreground" />
            <Button variant="ghost" size="icon-sm" aria-label={`Open ${f.name}`} onClick={() => handleView(f.storage_path)}>
              <ExternalLink className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${f.name}`} onClick={() => setPendingDelete(f)}>
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this file?"
        description={pendingDelete ? `"${pendingDelete.name}" will be permanently removed.` : undefined}
        onConfirm={() => {
          if (pendingDelete) deleteFile.mutate(pendingDelete, { onSuccess: () => toast.success('File deleted') })
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
