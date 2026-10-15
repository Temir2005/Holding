import type { Usage } from '../api/media'

/** Admin collections by the `entity_type` the backend uses in usages. */
const COLLECTION_OF: Record<string, string> = {
  division: 'divisions',
  project: 'projects',
  person: 'people',
  client: 'clients',
  timeline_event: 'timeline-events',
  stat: 'stats',
  vacancy: 'vacancies',
}

/** Query parameter of the page editor that opens one of its blocks. */
export const BLOCK_PARAM = 'block'

/**
 * Where a usage can be opened in the admin, or null. A block opens in its page's editor;
 * a published version opens its page.
 */
export function usageHref(usage: Usage): string | null {
  const direct = entityHref(usage.entity_type, usage.entity_id)
  if (direct) return direct
  if (usage.entity_type === 'section' && usage.page_id) {
    return `/admin/pages/${usage.page_id}?${BLOCK_PARAM}=${usage.entity_id}`
  }
  if (usage.entity_type === 'page_revision' && usage.page_id) return `/admin/pages/${usage.page_id}`
  return null
}

/** Where a record of this type opens in the admin (audit log, usages), or null. */
export function entityHref(entityType: string, id: string | null | undefined): string | null {
  const collection = COLLECTION_OF[entityType]
  if (collection && id) return `/admin/collections/${collection}/${id}`
  if (entityType === 'page' && id) return `/admin/pages/${id}`
  if (entityType === 'lead' && id) return `/admin/leads?lead=${id}`
  if (entityType === 'site_settings') return '/admin/settings'
  if (entityType === 'admin_user') return '/admin/users'
  return null
}

/** `details` of a 409 IN_USE, if it has the expected shape. */
export function usagesFromDetails(details: unknown): Usage[] {
  if (!Array.isArray(details)) return []
  return details.filter(
    (u): u is Usage =>
      typeof u === 'object' &&
      u !== null &&
      typeof (u as Usage).label === 'string' &&
      typeof (u as Usage).entity_type === 'string',
  )
}
