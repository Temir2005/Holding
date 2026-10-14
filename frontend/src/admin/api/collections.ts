/**
 * Collections share one set of endpoints (`/admin/<collection>`: list, create, get, edit,
 * delete, reorder), so one generic page serves all of them. The typed `api` client needs
 * a literal path per call, which a generic page does not have; requests go through
 * `request` instead, and the item type comes from the collection's declaration
 * (features/collections/config.tsx), itself taken from the generated schema.
 */
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import type { CollectionSlug } from '../layout/nav'
import { request } from './client'
import { adminKey } from './queries'

type S = components['schemas']

/** What every collection record has. */
export interface CollectionItem {
  id: string
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
  version: number
}

export type DivisionItem = S['DivisionAdminRead']
export type ProjectItem = S['ProjectAdminRead']
export type PersonItem = S['PersonAdminRead']
export type ClientItem = S['ClientAdminRead']
export type TimelineEventItem = S['TimelineEventAdminRead']
export type StatItem = S['StatAdminRead']
export type VacancyItem = S['VacancyAdminRead']

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export type FilterValues = Record<string, string | boolean | null>

export interface ListQuery {
  q: string
  sort: string | null
  filters: FilterValues
}

export const COLLECTION_PAGE_SIZE = 100

const base = (slug: CollectionSlug) => `/api/v1/admin/${slug}`

async function call<T>(
  template: string,
  method: string,
  options: Omit<Parameters<typeof request>[1], 'method'> = {},
): Promise<T> {
  const res = await request(template, { ...options, method })
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const collectionKey = (slug: CollectionSlug) => [...adminKey, 'collections', slug] as const

/** A collection, 100 records at a time ("show more"). */
export const collectionListQuery = <T extends CollectionItem>(
  slug: CollectionSlug,
  query: ListQuery,
) =>
  infiniteQueryOptions({
    queryKey: [...collectionKey(slug), 'list', query],
    queryFn: ({ pageParam, signal }) =>
      call<Paginated<T>>(base(slug), 'GET', {
        query: {
          ...query.filters,
          page: pageParam,
          page_size: COLLECTION_PAGE_SIZE,
          q: query.q || null,
          sort: query.sort,
        },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<T>) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
  })

export const collectionItemQuery = <T extends CollectionItem>(slug: CollectionSlug, id: string) =>
  queryOptions({
    queryKey: [...collectionKey(slug), 'item', id],
    queryFn: ({ signal }) =>
      call<T>(`${base(slug)}/{item_id}`, 'GET', { path: { item_id: id }, signal }),
  })

export const collectionApi = {
  create: <T>(slug: CollectionSlug, body: Record<string, unknown>) =>
    call<T>(base(slug), 'POST', { body }),
  update: <T>(slug: CollectionSlug, id: string, body: Record<string, unknown>) =>
    call<T>(`${base(slug)}/{item_id}`, 'PATCH', { path: { item_id: id }, body }),
  remove: (slug: CollectionSlug, id: string, version: number) =>
    call<undefined>(`${base(slug)}/{item_id}`, 'DELETE', {
      path: { item_id: id },
      query: { version },
    }),
  reorder: (slug: CollectionSlug, ids: string[]) =>
    call<undefined>(`${base(slug)}/order`, 'PUT', { body: { ids } }),
}
