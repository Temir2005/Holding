import { queryOptions } from '@tanstack/react-query'
import type { components } from '@/api/schema'
import { api } from './client'
import { adminKey } from './queries'

export type AdminUser = components['schemas']['UserRead']
export type UserRole = components['schemas']['UserRole']

/** Mirrors MIN_PASSWORD_LENGTH in backend/app/schemas/admin/auth.py; the server re-checks. */
export const MIN_PASSWORD_LENGTH = 10

export const usersKey = [...adminKey, 'users'] as const

/** All admin users (a handful): one page of 100. */
export const usersQuery = () =>
  queryOptions({
    queryKey: [...usersKey, 'list'],
    queryFn: ({ signal }) => api.get('/api/v1/admin/users', { query: { page_size: 100 }, signal }),
  })
