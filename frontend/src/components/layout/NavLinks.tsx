import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { NavItem } from '@/api/types'
import { cn } from '@/lib/cn'
import { pagePath, useLocale } from '@/lib/locale'

type Props = {
  items: NavItem[]
  className?: string
  linkClassName?: string
  onNavigate?: () => void
  /** Content before each label (the sheet number in the menu and the footer register). */
  renderPrefix?: (index: number) => ReactNode
}

/** Navigation from the CMS settings. The current page is marked with the red line underneath. */
export function NavLinks({ items, className, linkClassName, onNavigate, renderPrefix }: Props) {
  const locale = useLocale()
  return (
    <ul className={className}>
      {items.map((item, i) => (
        <li key={`${item.label}-${item.page_slug ?? item.anchor ?? item.url}`}>
          {item.page_slug ? (
            <NavLink
              to={pagePath(locale, item.page_slug) + (item.anchor ? `#${item.anchor}` : '')}
              end={item.page_slug === 'home'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  linkClassName,
                  'transition-colors duration-1',
                  isActive
                    ? 'text-fg shadow-[inset_0_-1px_0_rgb(var(--trace))]'
                    : 'text-fg-mute hover:text-fg',
                )
              }
            >
              {renderPrefix?.(i)}
              <span>{item.label}</span>
            </NavLink>
          ) : (
            <a
              href={item.url ?? `#${item.anchor ?? ''}`}
              onClick={onNavigate}
              className={cn(
                linkClassName,
                'text-fg-mute transition-colors duration-1 hover:text-fg',
              )}
            >
              {renderPrefix?.(i)}
              <span>{item.label}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
