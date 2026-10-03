import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter } from '@/components/ui/Filter'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ClientLogo } from './ClientsMarqueeSection'
import { headingId, type SectionProps } from './types'

export function ClientsGridSection({ section }: SectionProps<'clients_grid'>) {
  const { data } = section
  const { t } = useTranslation()
  const [industry, setIndustry] = useState('all')
  const industries = useMemo(() => {
    const map = new Map<string, string>()
    data.clients.forEach((c) => map.set(c.industry, c.industry_label))
    return [...map]
  }, [data.clients])
  const visible = industry === 'all' ? data.clients : data.clients.filter((c) => c.industry === industry)

  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      {data.show_industry_filter && industries.length > 1 && (
        <div className="mb-8">
          <Filter
            label={data.title ?? t('common.all')}
            value={industry}
            onChange={setIndustry}
            options={[{ value: 'all', label: t('common.all') }, ...industries.map(([value, label]) => ({ value, label }))]}
          />
        </div>
      )}
      <ul className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((c, i) => (
          <Reveal as="li" key={c.id} delay={stagger(i % 4)} className="flex flex-col gap-3">
            <div className="rounded-tile bg-tile p-2"><ClientLogo client={c} /></div>
            <div className="flex flex-col gap-0.5 px-1">
              <p className="font-display font-semibold">{c.name}</p>
              <p className="font-mono text-xs text-fg-mute">{c.industry_label}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}
