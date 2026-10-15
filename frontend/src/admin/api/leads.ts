import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api, request } from './client'
import { adminKey } from './queries'

type S = components['schemas']
export type Lead = S['LeadAdminRead']
export type LeadStatus = S['LeadStatus']
export type LeadType = S['LeadType']

export interface LeadFilters {
  q: string
  type: LeadType | null
  status: LeadStatus | null
  /** Moments with the user's offset (features/period.ts). */
  created_from: string | null
  created_to: string | null
}

export const leadsKey = [...adminKey, 'leads'] as const
export const LEADS_PAGE_SIZE = 50

const query = (filters: LeadFilters) => ({
  q: filters.q || null,
  type: filters.type,
  status: filters.status,
  created_from: filters.created_from,
  created_to: filters.created_to,
})

/** Newest first, 50 at a time ("show more"). */
export const leadsListQuery = (filters: LeadFilters) =>
  infiniteQueryOptions({
    queryKey: [...leadsKey, 'list', filters],
    queryFn: ({ pageParam, signal }) =>
      api.get('/api/v1/admin/leads', {
        query: { ...query(filters), page: pageParam, page_size: LEADS_PAGE_SIZE },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
  })

export const leadQuery = (id: string) =>
  queryOptions({
    queryKey: [...leadsKey, 'item', id],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/leads/{lead_id}', { path: { lead_id: id }, signal }),
  })

/** The next step of a lead's handling, offered as a one-click button. */
export const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  new: 'in_progress',
  in_progress: 'done',
}

/**
 * Downloads the leads matching the filters as CSV. The file needs the access token, so it
 * is fetched and saved from memory instead of following a link.
 */
export async function downloadLeadsCsv(filters: LeadFilters): Promise<void> {
  const res = await request('/api/v1/admin/leads/export', { method: 'GET', query: query(filters) })
  const name =
    /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'leads.csv'
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
