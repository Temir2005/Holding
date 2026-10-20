import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Project } from '@/api/types'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Section } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'
import { Datum } from './Datum'
import { ProjectStamp } from './ProjectStamp'
import { fromDatum } from './trace'

/** Up to this many characters the name is set in display size, longer ones in title size. */
const DISPLAY_MAX = 22
const PROJECT_TITLE_ID = 'project-title'

/**
 * First screen of the project sheet, built like the hero: the crumb back to the register, the
 * name, the datum where the line is born, then a narrow column (short description over the title
 * block) and the cover running out to the right edge. LCP: the name and the cover are on screen
 * from the first frame (cover with `priority`, no reveal); only the datum and crop marks move.
 */
export function ProjectHead({ project: p }: { project: Project }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const display = p.title.length <= DISPLAY_MAX

  return (
    <Section tone="dark" space="none" trace={fromDatum} labelledBy={PROJECT_TITLE_ID}>
      <div className="flex min-h-[100svh] flex-col pb-section-y-end pt-[calc(var(--header-h)+clamp(24px,3vw,48px))]">
        <div className="border-b border-line pb-4">
          {/* no station tick: the line is born lower, on the datum */}
          <Eyebrow numbered={false} station={false}>
            <Link
              to={`/${locale}/projects`}
              className="inline-flex min-h-11 items-center gap-3 text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent-ink))]"
            >
              <span aria-hidden="true">←</span>
              <span className="link-draw">{t('project.backToProjects')}</span>
            </Link>
          </Eyebrow>
        </div>

        <h1
          id={PROJECT_TITLE_ID}
          className={cn(
            'mt-[clamp(32px,4vw,64px)] font-heading [overflow-wrap:break-word]',
            display ? 'max-w-[11.5em] text-display' : 'max-w-[16em] text-title',
          )}
        >
          {p.title}
        </h1>

        <Datum className="mb-[clamp(32px,3.4vw,56px)] mt-12 sm:mt-[clamp(32px,3.4vw,56px)]" />

        <div className="grid flex-1 grid-cols-12 gap-x-gap gap-y-10 lg:grid-rows-[minmax(0,1fr)]">
          <div className="order-2 col-span-12 flex flex-col justify-between gap-10 md:col-span-8 lg:order-1 lg:col-span-4 xl:col-span-3">
            {p.short_description && <p className="text-lead">{p.short_description}</p>}
            <ProjectStamp project={p} />
          </div>

          <figure className="relative order-1 col-span-12 flex min-h-0 flex-col lg:order-2 lg:col-span-8 lg:mr-[calc(var(--pad-r)*-1)] lg:min-h-[clamp(360px,56svh,760px)] xl:col-span-9">
            <div className="relative aspect-[4/3] w-full flex-1 md:aspect-[16/9] lg:aspect-auto">
              <SmartImage
                media={p.cover}
                fill
                priority
                sizes="(min-width: 1280px) 75vw, (min-width: 1024px) 67vw, 100vw"
                className="absolute inset-0"
              />
              <span aria-hidden="true" className="crop-mark -left-2 -top-2 border-l border-t" />
              <span aria-hidden="true" className="crop-mark -bottom-2 -left-2 border-b border-l" />
              <span
                aria-hidden="true"
                className="crop-mark -right-2 -top-2 border-r border-t lg:hidden"
              />
              <span
                aria-hidden="true"
                className="crop-mark -bottom-2 -right-2 border-b border-r lg:hidden"
              />
            </div>
          </figure>
        </div>
      </div>
    </Section>
  )
}
