import { queryOptions } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api } from './client'
import { adminKey } from './queries'

type S = components['schemas']
export type PageSummary = S['PageAdminRead']
export type PageDetail = S['PageDetail']
export type SectionRead = S['SectionAdminRead']
export type Revision = S['RevisionRead']
export type RevisionDetail = S['RevisionDetail']
export type PageUpdate = S['PageUpdate']
export type SectionUpdate = S['SectionUpdate']
export type SectionCreate = S['SectionCreate']

export const pagesKey = [...adminKey, 'pages'] as const

export const pagesListQuery = () =>
  queryOptions({
    queryKey: [...pagesKey, 'list'],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/pages', { query: { page_size: 100, sort: 'sort_order' }, signal }),
  })

export const pageDetailQuery = (id: string) =>
  queryOptions({
    queryKey: [...pagesKey, 'detail', id],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/pages/{page_id}', { path: { page_id: id }, signal }),
  })

export const revisionsQuery = (id: string) =>
  queryOptions({
    queryKey: [...pagesKey, 'revisions', id],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/pages/{page_id}/revisions', { path: { page_id: id }, signal }),
  })

export const revisionQuery = (id: string, number: number) =>
  queryOptions({
    queryKey: [...pagesKey, 'revision', id, number],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/pages/{page_id}/revisions/{number}', {
        path: { page_id: id, number },
        signal,
      }),
    staleTime: Infinity,
  })

export type PageStatus = 'live' | 'changed' | 'down' | 'never'

/** What the editor needs to know first: is the page on the site and is it up to date. */
export function pageStatus(page: PageSummary): PageStatus {
  if (page.is_published) return page.has_unpublished_changes ? 'changed' : 'live'
  return page.published_revision_number === null ? 'never' : 'down'
}

/** Nothing to publish: the page is on the site and the draft equals it. */
export function canPublish(page: PageSummary): boolean {
  return !page.is_published || page.has_unpublished_changes
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The Russian title of a block, for the list of blocks; empty if it has none. */
export function blockTitle(data: unknown): string {
  if (!isRecord(data)) return ''
  for (const key of ['title', 'text', 'intro', 'body']) {
    const value = data[key]
    if (isRecord(value) && typeof value.ru === 'string' && value.ru.trim()) {
      return value.ru
        .replace(/[#*_>[\]]/g, '')
        .trim()
        .slice(0, 120)
    }
  }
  return ''
}

/** Russian page title. */
export function pageTitle(page: Pick<PageSummary, 'title' | 'slug'>): string {
  const ru = (page.title as Record<string, unknown>).ru
  return typeof ru === 'string' && ru ? ru : page.slug
}

export const SITE_LOCALES = ['ru', 'kk', 'en'] as const
export type SiteLocale = (typeof SITE_LOCALES)[number]

/** A preview link lives 30 minutes; it is renewed a bit earlier. */
export const previewTokenQuery = (pageId: string) => ({
  queryKey: [...pagesKey, 'preview-token', pageId],
  queryFn: () =>
    api.post('/api/v1/admin/pages/{page_id}/preview-token', { path: { page_id: pageId } }),
  staleTime: 25 * 60_000,
  gcTime: 25 * 60_000,
})

export function previewUrl(slug: string, token: string, locale: SiteLocale = 'ru') {
  return `/${locale}/preview/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`
}
