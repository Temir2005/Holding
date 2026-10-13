import { QueryClient, queryOptions } from '@tanstack/react-query'
import { api } from './client'
import { AdminApiError } from './errors'

/** Separate from the site's client: other defaults, and cleared on sign-out. */
export function createAdminQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // Client errors (404, 403, 422) will not fix themselves; network hiccups might.
        retry: (count, error) =>
          count < 2 &&
          !(error instanceof AdminApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  })
}

/** Every admin query key starts with this, so invalidation can target the admin only. */
export const adminKey = ['admin'] as const

export const newLeadsCountQuery = () =>
  queryOptions({
    queryKey: [...adminKey, 'leads', 'new-count'],
    queryFn: async ({ signal }) => {
      const page = await api.get('/api/v1/admin/leads', {
        query: { status: 'new', page_size: 1 },
        signal,
      })
      return page.total
    },
    refetchInterval: 60_000,
  })
