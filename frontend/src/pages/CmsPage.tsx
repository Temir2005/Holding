import { useParams } from 'react-router-dom'
import { isNotFound, usePage } from '@/api/queries'
import { Seo } from '@/components/Seo'
import { PageRenderer } from '@/sections/PageRenderer'
import { useLocale } from '@/lib/locale'
import { ErrorState, NotFoundPage, PageSkeleton } from './states'

/** Any page assembled in the CMS. The route decides the slug; content decides everything else. */
export function CmsPage({ slug }: { slug: string }) {
  const locale = useLocale()
  const { data, error, isPending, refetch } = usePage(slug, locale)

  if (isPending) return <PageSkeleton />
  if (error) return isNotFound(error) ? <NotFoundPage /> : <ErrorState onRetry={() => void refetch()} />

  return (
    <>
      <Seo title={data.seo.title} description={data.seo.description} image={data.seo.og_image} />
      <PageRenderer sections={data.sections} />
    </>
  )
}

export function CmsPageRoute() {
  const { slug = 'home' } = useParams()
  return <CmsPage key={slug} slug={slug} />
}
