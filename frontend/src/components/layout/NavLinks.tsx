import { NavLink } from 'react-router-dom'
import type { NavItem } from '@/api/types'
import { cn } from '@/lib/cn'
import { pagePath, useLocale } from '@/lib/locale'

type Props = { items: NavItem[]; className?: string; linkClassName?: string; onNavigate?: () => void }

export function NavLinks({ items, className, linkClassName, onNavigate }: Props) {
  const locale = useLocale()
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={`${item.label}-${item.page_slug ?? item.anchor ?? item.url}`}>
          {item.page_slug ? (
            <NavLink
              to={pagePath(locale, item.page_slug) + (item.anchor ? `#${item.anchor}` : '')}
              end={item.page_slug === 'home'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(linkClassName, isActive ? 'text-fg' : 'text-fg-mute hover:text-fg')
              }
            >
              {item.label}
            </NavLink>
          ) : (
            <a
              href={item.url ?? `#${item.anchor ?? ''}`}
              onClick={onNavigate}
              className={cn(linkClassName, 'text-fg-mute hover:text-fg')}
            >
              {item.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
