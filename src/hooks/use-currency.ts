import { useSettings } from '@/features/settings/api'

export function useCurrency() {
  const { data } = useSettings()
  return data?.currency ?? 'PHP'
}
