import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Optimistic updates for list caches.
 *
 * The change is applied to every cached *list* under `queryKey` the moment the
 * mutation starts, so the UI responds instantly. If the save fails, the
 * snapshot is restored (the global MutationCache already shows the error toast).
 * Non-list entries under the same prefix — a detail record, computed totals —
 * are left alone; they refresh when the save lands.
 */
type Row = { id: string }
export interface OptimisticSnapshot {
  rollback: () => void
}

export async function patchCachedLists(
  queryClient: QueryClient,
  queryKey: QueryKey,
  update: (rows: Row[]) => Row[],
): Promise<OptimisticSnapshot> {
  await queryClient.cancelQueries({ queryKey })
  const snapshot = queryClient.getQueriesData<unknown>({ queryKey })
  for (const [key, data] of snapshot) {
    if (!Array.isArray(data)) continue
    const next = update(data as Row[])
    // Leave untouched lists alone so their subscribers don't re-render for nothing.
    if (next.length !== data.length || next.some((row, i) => row !== data[i])) queryClient.setQueryData(key, next)
  }
  return {
    rollback: () => {
      for (const [key, data] of snapshot) queryClient.setQueryData(key, data)
    },
  }
}

const undo = (_error: unknown, _variables: unknown, snapshot: OptimisticSnapshot | undefined) => snapshot?.rollback()

/** Spread into useMutation options for a mutation that deletes one row. */
export function optimisticRemove<V = string>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  getId: (variables: V) => string = (v) => v as unknown as string,
) {
  return {
    onMutate: (variables: V) => {
      const id = getId(variables)
      return patchCachedLists(queryClient, queryKey, (rows) => rows.filter((r) => r.id !== id))
    },
    onError: undo,
  }
}

/** Spread into useMutation options for a mutation whose variables are `{ id, ...changedFields }`. */
export function optimisticPatch<V extends { id: string }>(queryClient: QueryClient, queryKey: QueryKey) {
  return {
    onMutate: ({ id, ...patch }: V) =>
      patchCachedLists(queryClient, queryKey, (rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    onError: undo,
  }
}
