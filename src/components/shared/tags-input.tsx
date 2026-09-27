import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export function TagsInput({
  value,
  onChange,
  placeholder = 'Add and press Enter',
  suggestions = [],
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  suggestions?: string[]
}) {
  const [draft, setDraft] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setDraft('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const remaining = suggestions.filter((s) => !value.includes(s))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent p-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))}>
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="h-6 flex-1 border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
