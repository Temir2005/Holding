import { infiniteQueryOptions, QueryClient, queryOptions } from '@tanstack/react-query'
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

export type EntityTypeInfo = components['schemas']['EntityTypeInfo']
export type RefCard = components['schemas']['RefCard']
export type LookupKind = NonNullable<
  Parameters<typeof api.get<'/api/v1/admin/lookup'>>[1]
>['query']['kind']

/** Forms of non-block entities (media card…), built by SchemaForm. */
export const entityTypesQuery = () =>
  queryOptions({
    queryKey: [...adminKey, 'entity-types'],
    queryFn: ({ signal }) => api.get('/api/v1/admin/entity-types', { signal }),
    staleTime: Infinity,
  })

export const mediaKey = [...adminKey, 'media'] as const

export interface MediaFilters {
  q?: string
  kind?: components['schemas']['MediaKind'] | null
  folder?: string | null
  sort?: string
}

export const MEDIA_PAGE_SIZE = 40

/** The library, page by page ("show more"). */
export const mediaListQuery = (filters: MediaFilters) =>
  infiniteQueryOptions({
    queryKey: [...mediaKey, 'list', filters],
    queryFn: ({ pageParam, signal }) =>
      api.get('/api/v1/admin/media', {
        query: {
          page: pageParam,
          page_size: MEDIA_PAGE_SIZE,
          q: filters.q || null,
          kind: filters.kind ?? null,
          folder: filters.folder ?? null,
          sort: filters.sort ?? null,
        },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
  })

export const mediaFoldersQuery = () =>
  queryOptions({
    queryKey: [...mediaKey, 'folders'],
    queryFn: ({ signal }) => api.get('/api/v1/admin/media/folders', { signal }),
  })

export const mediaItemQuery = (id: string) =>
  queryOptions({
    queryKey: [...mediaKey, 'item', id],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/media/{media_id}', { path: { media_id: id }, signal }),
  })

export const mediaUsagesQuery = (id: string) =>
  queryOptions({
    queryKey: [...mediaKey, 'usages', id],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/media/{media_id}/usages', { path: { media_id: id }, signal }),
  })

/** Search for a reference picker (`kind` from `x-ref`, or `page` for links). */
export const lookupQuery = (kind: LookupKind, q: string) =>
  queryOptions({
    queryKey: [...adminKey, 'lookup', kind, q],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/lookup', { query: { kind, q: q || null, limit: 50 }, signal }),
  })
