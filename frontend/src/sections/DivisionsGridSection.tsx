import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { DivisionPreview } from './divisions/DivisionPreview'
import { DivisionRow } from './divisions/DivisionRow'
import { headingId, type SectionProps } from './types'

/**
 * Divisions as a split screen: a register on the left (number, name, tagline, facts as a chain
 * of dimensions, link), a large sticky frame on the right that cross-fades to the cover of the
 * hovered or focused row. On a phone and tablet every row is a card with its own 16:10 frame.
 */
export function DivisionsGridSection({ section }: SectionProps<'divisions_grid'>) {
  const { data } = section
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  const items = data.divisions
  if (!items.length && !data.title) return null
  const id = headingId(section.id)
  const current = Math.min(active, Math.max(items.length - 1, 0))

  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={data.title ? id : undefined}>
      <SectionHeader id={id} eyebrow={data.eyebrow} title={data.title} />
      {items.length === 0 ? (
        <p className="mono-label">{t('divisions.empty')}</p>
      ) : (
        <div className="grid grid-cols-12 items-start gap-x-gap">
          <ol className="col-span-12 border-t border-line-strong lg:col-span-7">
            {items.map((d, i) => (
              <DivisionRow
                key={d.id}
                division={d}
                index={i}
                active={i === current}
                dense={items.length > 6}
                onActivate={() => setActive(i)}
              />
            ))}
          </ol>
          <DivisionPreview
            items={items}
            active={current}
            className="col-span-5 col-start-8 hidden lg:block"
          />
        </div>
      )}
    </Section>
  )
}
