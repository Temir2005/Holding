import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectCard as Card } from '@/api/types'
import { SmartImage } from '@/components/ui/SmartImage'
import { SiteLink } from '@/components/ui/SiteLink'
import { pagePath, useLocale } from '@/lib/locale'
import { STATUS_COLOR, useProjectMeta } from './projectMeta'

export function ProjectCardView({
  project: p,
  headingLevel = 3,
}: {
  project: Card
  headingLevel?: 2 | 3
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const meta = useProjectMeta()
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <SiteLink to={pagePath(locale, `projects/${p.slug}`)} className="card">
      <div className="card__img">
        <SmartImage media={p.cover} fill sizes="(max-width: 600px) 100vw, 33vw" />
        <div className="card__chips">
          <span className="chip" style={{ '--c': STATUS_COLOR[p.status] } as CSSProperties}>
            <i />
            {t(`status.${p.status}`)}
          </span>
          {p.is_tokenized && (
            <span className="chip chip--dark">
              <i />
              {t('ui.tokenized')}
            </span>
          )}
        </div>
      </div>
      <H className="h3">{p.title}</H>
      <p>{meta(p)}</p>
    </SiteLink>
  )
}
