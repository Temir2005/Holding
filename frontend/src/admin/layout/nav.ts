import {
  Building2,
  ClipboardList,
  FileText,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  MoreHorizontal,
  type LucideIcon,
  Settings,
  ShieldCheck,
  Sigma,
  UserRound,
  Users,
  Briefcase,
  Handshake,
} from 'lucide-react'
import type { Role } from '../session/context'

export interface NavItem {
  to: string
  /** Key in the `admin` i18n namespace. */
  label: string
  icon: LucideIcon
  role: Role
  /** `end` matching for the dashboard so it is not active on every admin page. */
  end?: boolean
  badge?: 'newLeads'
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

/** Admin collections in menu order; the slug is also the API path segment. */
export const COLLECTIONS = [
  { slug: 'divisions', icon: Building2 },
  { slug: 'projects', icon: Briefcase },
  { slug: 'people', icon: UserRound },
  { slug: 'clients', icon: Handshake },
  { slug: 'timeline-events', icon: History },
  { slug: 'stats', icon: Sigma },
  { slug: 'vacancies', icon: ClipboardList },
] as const

export type CollectionSlug = (typeof COLLECTIONS)[number]['slug']

export const NAV: NavGroup[] = [
  {
    items: [
      { to: '/admin', label: 'nav.dashboard', icon: LayoutDashboard, role: 'editor', end: true },
      { to: '/admin/pages', label: 'nav.pages', icon: FileText, role: 'editor' },
      { to: '/admin/media', label: 'nav.media', icon: Images, role: 'editor' },
      { to: '/admin/leads', label: 'nav.leads', icon: Inbox, role: 'editor', badge: 'newLeads' },
    ],
  },
  {
    label: 'nav.collections',
    items: COLLECTIONS.map(({ slug, icon }) => ({
      to: `/admin/collections/${slug}`,
      label: `collections.${slug}`,
      icon,
      role: 'editor' as const,
    })),
  },
  {
    items: [
      { to: '/admin/settings', label: 'nav.settings', icon: Settings, role: 'admin' },
      { to: '/admin/users', label: 'nav.users', icon: Users, role: 'admin' },
      { to: '/admin/audit', label: 'nav.audit', icon: ShieldCheck, role: 'admin' },
    ],
  },
]

/** Phone bottom bar: the most frequent tasks; the rest is under "More". */
export const BOTTOM_BAR: string[] = ['/admin', '/admin/pages', '/admin/leads', '/admin/media']

export const MORE_ICON = MoreHorizontal
