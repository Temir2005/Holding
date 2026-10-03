import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import type { Locale } from '@/lib/locale'
import { ApiError, apiGet, apiPost } from './client'
import type { LeadCreate, LeadCreated, Page, Project, SiteSettings } from './types'

const retry = (count: number, error: Error) =>
  !(error instanceof ApiError && error.status < 500) && count < 2

export const settingsQuery = (locale: Locale) =>
  queryOptions({
    queryKey: ['settings', locale],
    queryFn: ({ signal }) => apiGet<SiteSettings>('/settings', { locale }, signal),
    staleTime: 5 * 60_000,
    retry,
  })

export const pageQuery = (slug: string, locale: Locale) =>
  queryOptions({
    queryKey: ['page', slug, locale],
    queryFn: ({ signal }) => apiGet<Page>(`/pages/${encodeURIComponent(slug)}`, { locale }, signal),
    retry,
  })

export const projectQuery = (slug: string, locale: Locale) =>
  queryOptions({
    queryKey: ['project', slug, locale],
    queryFn: ({ signal }) =>
      apiGet<Project>(`/projects/${encodeURIComponent(slug)}`, { locale }, signal),
    retry,
  })

export const useSettings = (locale: Locale) => useQuery(settingsQuery(locale))
export const usePage = (slug: string, locale: Locale) => useQuery(pageQuery(slug, locale))
export const useProject = (slug: string, locale: Locale) => useQuery(projectQuery(slug, locale))

export const useCreateLead = () =>
  useMutation({ mutationFn: (data: LeadCreate) => apiPost<LeadCreated>('/leads', data) })

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
