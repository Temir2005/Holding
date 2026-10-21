import { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { isNotFound, useProject } from '@/api/queries'
import { Seo } from '@/components/Seo'
import { useIdle } from '@/lib/idle'
import { useLocale } from '@/lib/locale'
import { ProjectHead } from './project/ProjectHead'
import { loadProjectRest as ProjectRest } from './project/rest'
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
  // the sheets below the first screen come once the browser is idle, as in PageRenderer
  const rest = useIdle()

  if (isPending) return <ProjectSkeleton />
  if (error)
    return isNotFound(error) ? <NotFoundPage /> : <ErrorState onRetry={() => void refetch()} />

  return (
    <>
      <Seo title={`${p.title} · MegaSmart`} description={p.short_description} image={p.cover} />
      <article>
        <ProjectHead project={p} />
        {/* a screen of empty sheet holds the place, as in PageRenderer */}
        <Suspense fallback={<div aria-hidden="true" className="min-h-[100svh]" />}>
          {rest ? (
            <ProjectRest project={p} />
          ) : (
            <div aria-hidden="true" className="min-h-[100svh]" />
          )}
        </Suspense>
      </article>
    </>
  )
}
