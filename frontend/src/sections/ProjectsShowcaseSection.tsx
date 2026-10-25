import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Arrow, CmsLink, Head, Sec } from '@/components/site/kit'
import { ProjectCardView } from '@/components/site/ProjectCard'
import type { SectionProps } from './types'

/** Featured projects as a horizontal rail with arrows; swipe on touch. */
export function ProjectsShowcaseSection({ section }: SectionProps<'projects_showcase'>) {
  const { t } = useTranslation()
  const d = section.data
  const rail = useRef<HTMLDivElement>(null)
  if (!d.projects.length) return null
  const step = (dir: number) => {
    const el = rail.current
    const card = el?.querySelector('.card')
    if (!el || !card) return
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 24), behavior: 'smooth' })
  }
  return (
    <Sec tone={section.tone} anchor={section.anchor} style={{ overflow: 'hidden' }}>
      <div className="wrap">
        <Head
          eyebrow={d.eyebrow}
          title={d.title}
          aside={
            <div className="ctas" style={{ marginTop: 0, alignItems: 'center' }}>
              <button className="circ" aria-label={t('a11y.prev')} onClick={() => step(-1)}>
                <ArrowLeft />
              </button>
              <button className="circ" aria-label={t('a11y.next')} onClick={() => step(1)}>
                <Arrow />
              </button>
              {d.link && (
                <CmsLink
                  href={d.link.href}
                  className={section.tone === 'dark' ? 'btn btn--white' : 'btn btn--ink'}
                >
                  {d.link.label}
                </CmsLink>
              )}
            </div>
          }
        />
      </div>
      <div className="rail" ref={rail}>
        {d.projects.map((p) => (
          <ProjectCardView key={p.id} project={p} />
        ))}
      </div>
    </Sec>
  )
}
