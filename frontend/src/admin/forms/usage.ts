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

/**
 * Where a usage can be opened in the admin, or null. Blocks and published versions carry
 * no page id in the API response, so they show only their label.
 */
export function usageHref(usage: Usage): string | null {
  const collection = COLLECTION_OF[usage.entity_type]
  if (collection) return `/admin/collections/${collection}/${usage.entity_id}`
  if (usage.entity_type === 'page') return `/admin/pages/${usage.entity_id}`
  if (usage.entity_type === 'site_settings') return '/admin/settings'
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
