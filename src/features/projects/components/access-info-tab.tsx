import { safeHref } from '@/lib/url'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2, KeyRound, ExternalLink } from 'lucide-react'
import { useAccessInfo, useCreateAccessInfo, useDeleteAccessInfo } from '@/features/projects/access-info-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CopyButton } from '@/components/shared/copy-button'
import { listItem } from '@/lib/motion'

export function AccessInfoTab({ projectId }: { projectId: string }) {
  const { data: entries, isLoading } = useAccessInfo(projectId)
  const createEntry = useCreateAccessInfo(projectId)
  const deleteEntry = useDeleteAccessInfo(projectId)

  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [credentialLocation, setCredentialLocation] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleAdd = () => {
    if (!label.trim()) return
    createEntry.mutate(
      { label, url: url || null, username: username || null, credential_location: credentialLocation || null },
      {
        onSuccess: () => {
          setLabel('')
          setUrl('')
          setUsername('')
          setCredentialLocation('')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        No passwords are stored here — just where to find them (e.g. "Saved in Bitwarden").
      </p>

      {!isLoading && entries?.length === 0 && (
        <EmptyState icon={KeyRound} title="No access info yet" description="Track admin logins, cPanel, domain registrar, and more." />
      )}

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {entries?.map((e) => (
            <motion.div
              key={e.id}
              layout="position"
              variants={listItem}
              initial="hidden"
              animate="show"
              exit="exit"
              className="group flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm"
            >
              <span className="w-32 shrink-0 font-medium">{e.label}</span>
              {e.url && (
                <span className="flex min-w-0 items-center gap-1">
                  {safeHref(e.url) ? (
                    <a
                      href={safeHref(e.url) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1 break-all text-muted-foreground hover:underline"
                    >
                      {e.url} <ExternalLink className="size-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="break-all text-muted-foreground">{e.url}</span>
                  )}
                  <CopyButton value={e.url} label="URL" />
                </span>
              )}
              {e.username && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  User: {e.username}
                  <CopyButton value={e.username} label="username" />
                </span>
              )}
              {e.credential_location && <span className="text-muted-foreground">🔒 {e.credential_location}</span>}
              <Button variant="ghost" size="icon-sm" aria-label="Delete access entry" className="ml-auto md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100" onClick={() => setDeleteId(e.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <Input placeholder="Label (e.g. cPanel)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-40" />
        <Input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} className="min-w-32 flex-1" />
        <Input placeholder="Username / email" value={username} onChange={(e) => setUsername(e.target.value)} className="w-40" />
        <Input
          placeholder="Credential location (e.g. Saved in Bitwarden)"
          value={credentialLocation}
          onChange={(e) => setCredentialLocation(e.target.value)}
          className="min-w-48 flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={createEntry.isPending}>
          <Plus /> Add
        </Button>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this access entry?"
        onConfirm={() => {
          if (deleteId) deleteEntry.mutate(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
