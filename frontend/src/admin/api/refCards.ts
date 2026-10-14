/**
 * Cards of referenced objects (`RefCard`) for reference fields, cached one by one:
 * a page detail brings cards of everything its blocks reference (`refs`), pickers add the
 * chosen objects, and `lookup?ids=` fetches only what is still unknown.
 */
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { api } from './client'
import { adminKey, type LookupKind, type RefCard } from './queries'

const cardKey = (kind: string, id: string) => [...adminKey, 'ref-card', kind, id] as const

export function rememberCards(queryClient: QueryClient, kind: string, cards: Iterable<RefCard>) {
  for (const card of cards) queryClient.setQueryData(cardKey(kind, card.id), card)
}

/** Cards from a page or section response: `{kind: {id: card}}`. */
export function rememberRefs(
  queryClient: QueryClient,
  refs: Record<string, Record<string, RefCard>> | undefined,
) {
  for (const [kind, byId] of Object.entries(refs ?? {})) {
    rememberCards(queryClient, kind, Object.values(byId))
  }
}

/** Cards for these ids, in the same order; ids without a card (deleted) are absent. */
export function useRefCards(queryClient: QueryClient, kind: LookupKind, ids: readonly string[]) {
  return useQuery({
    queryKey: [...adminKey, 'ref-cards', kind, ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const cached = new Map<string, RefCard>()
      for (const id of ids) {
        const card = queryClient.getQueryData<RefCard>(cardKey(kind, id))
        if (card) cached.set(id, card)
      }
      const missing = ids.filter((id) => !cached.has(id))
      if (missing.length > 0) {
        const fetched = await api.get('/api/v1/admin/lookup', {
          query: { kind, ids: missing, limit: Math.min(100, missing.length) },
          signal,
        })
        rememberCards(queryClient, kind, fetched)
        for (const card of fetched) cached.set(card.id, card)
      }
      return ids.flatMap((id) => cached.get(id) ?? [])
    },
  })
}
