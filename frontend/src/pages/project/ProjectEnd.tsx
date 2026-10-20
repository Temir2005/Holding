import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DimArrow } from '@/components/ui/DimArrow'
import { Section } from '@/components/ui/Section'
import { useLocale } from '@/lib/locale'

/**
 * End of the project sheet: the way back to the register, set large with the dimension arrow.
 * (Neighbouring projects would go here once the API gives them: ProjectRead has none today.)
 */
export function ProjectEnd() {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <Section tone="light" space="tight">
      <div className="flex flex-col gap-6 border-t border-fg pt-6 md:flex-row md:items-end md:justify-between">
        <p className="mono-label">{t('projectPage.register')}</p>
        <Link
          to={`/${locale}/projects`}
          className="group/more inline-flex items-center gap-6 self-start text-title font-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--accent-ink))] md:self-auto"
        >
          <span className="link-draw">{t('project.backToProjects')}</span>
          <DimArrow className="mt-[0.15em] scale-[1.4]" />
        </Link>
      </div>
    </Section>
  )
}
