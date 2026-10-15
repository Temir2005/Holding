import { queryOptions } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api } from './client'
import { adminKey } from './queries'

export type SiteSettings = components['schemas']['SettingsAdminRead']
export type SiteSettingsUpdate = components['schemas']['SettingsUpdate']

export const settingsQuery = () =>
  queryOptions({
    queryKey: [...adminKey, 'settings'],
    queryFn: ({ signal }) => api.get('/api/v1/admin/settings', { signal }),
  })
