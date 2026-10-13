import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useT } from '../i18n'
import { Sheet } from '../ui/Dialog'
import { BOTTOM_BAR, MORE_ICON, type NavItem } from './nav'
import { useNavGroups, useNewLeadsCount } from './navHooks'
import { CountBadge } from './Sidebar'

const tabClass = (active: boolean) =>
  cn(
    'relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
    active ? 'font-medium text-fg' : 'text-mute',
  )

/** Phones: four main sections plus "More" with everything else in a bottom sheet. */
export function BottomNav() {
  const t = useT()
  const groups = useNavGroups()
  const newLeads = useNewLeadsCount()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const all = groups.flatMap((g) => g.items)
  const main = BOTTOM_BAR.flatMap((to) => all.filter((item) => item.to === to))
  const inMore = all.some(
    (item) => !BOTTOM_BAR.includes(item.to) && location.pathname.startsWith(item.to),
  )
  const MoreIcon = MORE_ICON

  const count = (item: NavItem) => (item.badge === 'newLeads' ? newLeads : 0)

  return (
    <>
      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-nav flex h-bottombar border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {main.map((item) => {
          const Icon = item.icon
          const label = t(item.label)
          const n = count(item)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={n > 0 ? `${label}, ${t('nav.newLeads', { count: n })}` : undefined}
              className={({ isActive }) => tabClass(isActive)}
            >
              <span className="relative">
                <Icon size={20} aria-hidden="true" />
                <CountBadge count={n} compact />
              </span>
              <span>{label}</span>
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={tabClass(inMore)}
        >
          <MoreIcon size={20} aria-hidden="true" />
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title={t('nav.moreTitle')} side="bottom">
        <div className="flex flex-col gap-4 p-3">
          {groups.map((group, index) => (
            <div key={group.label ?? index}>
              {group.label && (
                <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-mute">
                  {t(group.label)}
                </p>
              )}
              <ul className="grid grid-cols-2 gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex min-h-touch items-center gap-3 rounded px-3 py-2 text-sm leading-tight',
                            isActive ? 'bg-sunken font-medium text-fg' : 'text-fg',
                          )
                        }
                      >
                        <Icon size={18} aria-hidden="true" className="shrink-0 text-mute" />
                        <span className="min-w-0 flex-1">{t(item.label)}</span>
                        <CountBadge count={count(item)} />
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  )
}
