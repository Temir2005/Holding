import type { Project } from '@/api/types'
import { HashLanding } from '@/components/layout/HashLanding'
import { ProjectBody } from './ProjectBody'
import { ProjectEnd } from './ProjectEnd'
import { ProjectGallery } from './ProjectGallery'

/** The description, the gallery and the way out: the sheets below the first screen. */
export function ProjectRest({ project }: { project: Project }) {
  return (
    <>
      <ProjectBody project={project} />
      <ProjectGallery media={project.gallery} />
      <ProjectEnd project={project} />
      <HashLanding />
    </>
  )
}
