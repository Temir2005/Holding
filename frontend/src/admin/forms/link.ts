/**
 * Link targets accepted by the backend (`LinkHref`): a page slug, `projects/<slug>`,
 * `#anchor` on the same page, or an external `https://`, `mailto:`, `tel:` address.
 */
export type LinkMode = 'page' | 'project' | 'anchor' | 'external'

export const LINK_MODES: LinkMode[] = ['page', 'project', 'anchor', 'external']
export const PROJECT_PREFIX = 'projects/'

export function linkMode(href: string): LinkMode {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return 'external'
  if (href.startsWith('#')) return 'anchor'
  if (href.startsWith(PROJECT_PREFIX)) return 'project'
  return 'page'
}

/** The part the editor types, without the mode's prefix. */
export function linkTarget(href: string, mode: LinkMode): string {
  if (mode === 'anchor') return href.replace(/^#/, '')
  if (mode === 'project')
    return href.startsWith(PROJECT_PREFIX) ? href.slice(PROJECT_PREFIX.length) : href
  return href
}

export function buildHref(mode: LinkMode, target: string): string {
  if (!target) return ''
  if (mode === 'anchor') return `#${target}`
  if (mode === 'project') return `${PROJECT_PREFIX}${target}`
  return target
}
