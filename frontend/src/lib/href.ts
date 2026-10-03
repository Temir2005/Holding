import { type Locale, pagePath } from './locale'

export type ResolvedHref =
  | { kind: 'external'; href: string }
  | { kind: 'anchor'; href: string }
  | { kind: 'internal'; to: string }

/**
 * CMS links come in three forms: "https://…", "#anchor" (same page) and a page slug
 * such as "projects" or "projects/aaag". Slugs get the current locale prefix.
 */
export function resolveHref(href: string, locale: Locale): ResolvedHref {
  if (/^(https?:|mailto:|tel:)/.test(href)) return { kind: 'external', href }
  if (href.startsWith('#')) return { kind: 'anchor', href }
  return { kind: 'internal', to: pagePath(locale, href.replace(/^\/+/, '')) }
}
