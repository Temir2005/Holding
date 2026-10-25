import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { ApiError, apiGet } from '@/api/client'
import type { Page } from '@/api/types'
import { Seo } from '@/components/Seo'
import { useLocale } from '@/lib/locale'
import { PageRenderer } from '@/sections/PageRenderer'
import { ErrorState, NotFoundPage, PageSkeleton, PreviewExpired } from './states'

/**
 * Draft of a page by a preview link from the admin (`/:locale/preview/:slug?token=…`).
 * Same rendering as the live page; never indexed; marked as not published.
 */
export function Component() {
  const { t } = useTranslation()
  const { slug = 'home' } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const locale = useLocale()
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['preview', slug, locale, token],
    queryFn: ({ signal }) =>
      apiGet<Page>(`/preview/pages/${encodeURIComponent(slug)}`, { token, locale }, signal),
    retry: false,
    staleTime: 0,
  })

  let content
  if (isPending) content = <PageSkeleton />
  else if (error instanceof ApiError && error.status === 404) content = <NotFoundPage />
  else if (error instanceof ApiError && error.status === 401) content = <PreviewExpired />
  else if (error) content = <ErrorState onRetry={() => void refetch()} />
  else
    content = (
      <>
        <Seo title={data.seo.title} description={data.seo.description} image={data.seo.og_image} />
        <PageRenderer sections={data.sections} />
      </>
    )

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {content}
      <p role="status" className="preview-bar">
        {t('preview.banner')}
      </p>
    </>
  )
}
