import { useQuery } from '@tanstack/react-query'
import { newLeadsCountQuery } from '../api/queries'
import { hasRole, useCurrentUser } from '../session/context'
import { NAV, type NavGroup } from './nav'

/** Navigation groups the current user may see. */
export function useNavGroups(): NavGroup[] {
  const user = useCurrentUser()
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasRole(user, item.role)),
  })).filter((group) => group.items.length > 0)
}

export function useNewLeadsCount(): number {
  return useQuery(newLeadsCountQuery()).data ?? 0
}
