import { useTranslation } from 'react-i18next'
import { CmsLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { headingId, type SectionProps } from './types'

export function VacanciesSection({ section }: SectionProps<'vacancies'>) {
  const { data } = section
  const { t } = useTranslation()
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} intro={data.intro} />
      {data.vacancies.length === 0 ? (
        <p className="text-lead text-fg-mute">{data.empty_text}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.vacancies.map((v) => (
            <Reveal as="li" key={v.id} className="grid grid-cols-1 gap-4 py-6 md:grid-cols-12 md:items-center">
              <div className="flex flex-col gap-1 md:col-span-5">
                <h3 className="text-h3">{v.title}</h3>
                {v.division && <p className="font-mono text-xs text-accent-ink">{v.division.name}</p>}
              </div>
              <p className="text-fg-mute md:col-span-4">
                {v.location} · {t(`vacancy.${v.employment_type}`)}
              </p>
              <div className="md:col-span-3 md:justify-self-end">
                <CmsLink href="#contacts" variant="secondary">{t('vacancy.apply')}</CmsLink>
              </div>
            </Reveal>
          ))}
        </ul>
      )}
    </Section>
  )
}
