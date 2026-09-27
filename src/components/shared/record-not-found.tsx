import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

export function RecordNotFound({ label, backTo }: { label: string; backTo: string }) {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon={SearchX}
      title={`${label} not found`}
      description="It may have been deleted, or the link is wrong."
      actionLabel="Go back"
      onAction={() => navigate(backTo)}
    />
  )
}
