import { useRef, useState } from 'react'
import { Upload, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAttachmentUrl } from '@/lib/storage'
import { toast } from 'sonner'

export function FileUploadField({
  file,
  onFileChange,
  existingPath,
  onRemoveExisting,
  accept,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  existingPath?: string | null
  onRemoveExisting?: () => void
  accept?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState(false)

  const handleView = async () => {
    if (!existingPath) return
    setViewing(true)
    try {
      const url = await getAttachmentUrl(existingPath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not open file')
    } finally {
      setViewing(false)
    }
  }

  if (existingPath && !file) {
    return (
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleView} disabled={viewing}>
          <ExternalLink /> View file
        </Button>
        {onRemoveExisting && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={onRemoveExisting}>
            <X />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload /> {file ? 'Change file' : 'Upload file'}
      </Button>
      {file && (
        <>
          <span className="truncate text-sm text-muted-foreground">{file.name}</span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear selected file" onClick={() => onFileChange(null)}>
            <X />
          </Button>
        </>
      )}
    </div>
  )
}
