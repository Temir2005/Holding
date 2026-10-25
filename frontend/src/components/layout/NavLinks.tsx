import { NavLink } from 'react-router-dom'
import type { NavItem } from '@/api/types'
import { pagePath, useLocale } from '@/lib/locale'
import { usePrefetchIntent } from '@/lib/prefetch'

/** Navigation from the CMS settings: pages, anchors or external links. */
export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const locale = useLocale()
  return (
    <>
      {items.map((item) =>
        item.page_slug ? (
          <PageLink
            key={`${item.label}-${item.page_slug}`}
            to={pagePath(locale, item.page_slug) + (item.anchor ? `#${item.anchor}` : '')}
            end={item.page_slug === 'home'}
            onClick={onNavigate}
          >
            {item.label}
          </PageLink>
        ) : (
          <a
            key={`${item.label}-${item.anchor ?? item.url}`}
            href={item.url ?? `#${item.anchor ?? ''}`}
            onClick={onNavigate}
          >
            {item.label}
          </a>
        ),
      )}
    </>
  )
}

function PageLink({
  to,
  end,
  onClick,
  children,
}: {
  to: string
  end: boolean
  onClick?: () => void
  children: string
}) {
  return (
    <NavLink to={to} end={end} viewTransition onClick={onClick} {...usePrefetchIntent(to)}>
      {children}
    </NavLink>
  )
}
