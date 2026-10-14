import { QueryClient, queryOptions } from '@tanstack/react-query'
import type { components } from '@/api/schema'
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

export type Meta = components['schemas']['Meta']
export type MetaOption = components['schemas']['Option']
export type SectionTypeInfo = components['schemas']['SectionTypeInfo']

/** Languages, enums with Russian labels, icons, dropdown choices (`x-options`). */
export const metaQuery = () =>
  queryOptions({
    queryKey: [...adminKey, 'meta'],
    queryFn: ({ signal }) => api.get('/api/v1/admin/meta', { signal }),
    staleTime: 5 * 60_000,
  })

/** Block types with their JSON Schema: forms are built from these. */
export const sectionTypesQuery = () =>
  queryOptions({
    queryKey: [...adminKey, 'section-types'],
    queryFn: ({ signal }) => api.get('/api/v1/admin/section-types', { signal }),
    staleTime: Infinity,
  })

/** A dropdown list named by an `x-options` hint, e.g. `divisions`; empty if unknown. */
export function metaOptions(meta: Meta | undefined, name: string): MetaOption[] {
  const list: unknown = meta?.[name as keyof Meta]
  return Array.isArray(list) &&
    list.every((o) => typeof o === 'object' && o !== null && 'value' in o)
    ? (list as MetaOption[])
    : []
}
