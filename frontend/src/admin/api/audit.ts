import { infiniteQueryOptions } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api } from './client'
import { adminKey } from './queries'

export type AuditEntry = components['schemas']['AuditRead']

export interface AuditFilters {
  user_id: string | null
  entity_type: string | null
  entity_id: string | null
  action: string | null
  /** Moments with the user's offset (features/period.ts). */
  since: string | null
  until: string | null
}

export const AUDIT_PAGE_SIZE = 50

/** Newest first, 50 at a time ("show more"). */
export const auditQuery = (filters: AuditFilters) =>
  infiniteQueryOptions({
    queryKey: [...adminKey, 'audit', filters],
    queryFn: ({ pageParam, signal }) =>
      api.get('/api/v1/admin/audit-log', {
        query: { ...filters, page: pageParam, page_size: AUDIT_PAGE_SIZE },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
  })

/** A value in the log as {field: [before, after]} (updates); null for other shapes. */
export function changedFields(
  entry: Pick<AuditEntry, 'action' | 'changes'>,
): [string, unknown, unknown][] | null {
  if (entry.action !== 'update' || !entry.changes) return null
  const rows = Object.entries(entry.changes)
  const pairs = rows.every(([, v]) => Array.isArray(v) && v.length === 2)
  return pairs ? rows.map(([key, v]) => [key, (v as unknown[])[0], (v as unknown[])[1]]) : null
}
