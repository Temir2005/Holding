import { useParams } from 'react-router-dom'
import { isNotFound, useProject } from '@/api/queries'
import { Seo } from '@/components/Seo'
import { useLocale } from '@/lib/locale'
import { ProjectBody } from './project/ProjectBody'
import { ProjectEnd } from './project/ProjectEnd'
import { ProjectGallery } from './project/ProjectGallery'
import { ProjectHead } from './project/ProjectHead'
import { ProjectSkeleton } from './project/ProjectSkeleton'
import { ErrorState, NotFoundPage } from './states'

/**
 * A project as a case of an architecture office, one drawing sheet: the first screen with the
 * cover and the title block, the description, the gallery, the way back to the register.
 * Not built from CMS sections, so it renders its own sheets and the line runs through them.
 */
export function ProjectPage() {
  const { slug = '' } = useParams()
  const locale = useLocale()
  const { data: p, error, isPending, refetch } = useProject(slug, locale)

  if (isPending) return <ProjectSkeleton />
  if (error)
    return isNotFound(error) ? <NotFoundPage /> : <ErrorState onRetry={() => void refetch()} />

  return (
    <>
      <Seo title={`${p.title} · MegaSmart`} description={p.short_description} image={p.cover} />
      <article>
        <ProjectHead project={p} />
        <ProjectBody project={p} />
        <ProjectGallery media={p.gallery} />
        <ProjectEnd />
      </article>
    </>
  )
}
