import { Link, useMatch, useResolvedPath } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useT } from '../i18n'
import { Tooltip } from '../ui/Tooltip'
import type { NavItem } from './nav'
import { useNavGroups, useNewLeadsCount } from './navHooks'
import { BREAKPOINTS, useMediaQuery } from './useMediaQuery'

export function CountBadge({ count, compact }: { count: number; compact?: boolean }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent',
        compact && 'absolute -right-0.5 -top-0.5 min-w-4 px-1 text-[10px] leading-4',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function SidebarLink({ item, compact }: { item: NavItem; compact: boolean }) {
  const t = useT()
  const newLeads = useNewLeadsCount()
  // Plain string classes: the tooltip trigger (Radix Slot) cannot merge NavLink's
  // function `className`, so the active state is computed here.
  const isActive = useMatch({ path: useResolvedPath(item.to).pathname, end: item.end ?? false })
  const count = item.badge === 'newLeads' ? newLeads : 0
  const label = t(item.label)
  const accessible = count > 0 ? `${label}, ${t('nav.newLeads', { count })}` : label
  const Icon = item.icon
  return (
    <li>
      <Tooltip label={label} side="right" enabled={compact}>
        <Link
          to={item.to}
          aria-current={isActive ? 'page' : undefined}
          aria-label={compact || count > 0 ? accessible : undefined}
          className={cn(
            'relative flex min-h-touch items-center gap-3 rounded px-3 text-sm md:min-h-9',
            'text-mute transition-colors hover:bg-sunken hover:text-fg',
            compact && 'justify-center px-0',
            isActive && 'bg-sunken font-medium text-fg',
          )}
        >
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
            />
          )}
          <span className="relative">
            <Icon size={18} aria-hidden="true" />
            {compact && <CountBadge count={count} compact />}
          </span>
          {!compact && <span className="flex-1 truncate">{label}</span>}
          {!compact && <CountBadge count={count} />}
        </Link>
      </Tooltip>
    </li>
  )
}

/** Desktop: full sidebar. Tablet: icon rail with tooltips. Hidden on phones. */
export function Sidebar() {
  const t = useT()
  const groups = useNavGroups()
  const compact = !useMediaQuery(BREAKPOINTS.xl)
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-y-0 left-0 z-nav hidden w-rail flex-col border-r border-line bg-panel md:flex xl:w-sidebar"
    >
      <div className="flex h-topbar items-center gap-2 border-b border-line px-4 max-xl:justify-center max-xl:px-0">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded bg-accent font-mono text-sm font-bold text-on-accent"
        >
          M
        </span>
        <span className="hidden flex-col leading-tight xl:flex">
          <span className="text-sm font-semibold">{t('app.brand')}</span>
          <span className="text-xs text-mute">{t('app.brandSub')}</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group, index) => (
          <div
            key={group.label ?? index}
            className={cn('mb-3', index > 0 && 'border-t border-line pt-3')}
          >
            {group.label && (
              <p className="mb-1 hidden px-3 text-xs font-medium uppercase tracking-wide text-mute xl:block">
                {t(group.label)}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.to} item={item} compact={compact} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
