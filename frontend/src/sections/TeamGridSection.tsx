import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Filter } from '@/components/ui/Filter'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { KeyPeople } from './team/KeyPeople'
import { divisionsOf, splitPeople } from './team/people'
import { TeamRegister } from './team/Register'
import { Spread } from './team/Spread'
import { rowTicks } from './team/trace'
import { headingId, type SectionProps } from './types'

const ALL = 'all'

/**
 * People of the holding in three registers of loudness:
 * - the founder (mode `founder`, or anyone flagged as founder): a monograph spread;
 * - key people: an editorial grid of portraits of different sizes;
 * - the wider team: a dense register with the bio on demand.
 * `mode: all` shows the groups in this order. The division filter narrows grid and register.
 */
export function TeamGridSection({ section }: SectionProps<'team_grid'>) {
  const { data } = section
  const { t } = useTranslation()
  const [division, setDivision] = useState(ALL)
  const groups = useMemo(() => splitPeople(data.people, data.mode), [data.people, data.mode])
  const divisions = useMemo(() => divisionsOf([...groups.key, ...groups.rest]), [groups])
  const title = data.title?.trim()
  if (!data.people.length && !title) return null

  const id = headingId(section.id)
  // Without a block title the first founder's name is the heading of the sheet.
  const founderIsHeading = !title && groups.founders.length > 0
  const showFilter = data.show_division_filter && divisions.length > 1
  const pick = <T extends { division: { slug: string } | null }>(list: T[]) =>
    division === ALL ? list : list.filter((p) => p.division?.slug === division)
  const key = pick(groups.key)
  const rest = pick(groups.rest)
  const onlyOneKey = groups.key.length === 1 && !groups.rest.length && !groups.founders.length

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={title || founderIsHeading ? id : undefined}
      branches={rest.length ? rowTicks : undefined}
    >
      {title ? (
        <SectionHeader id={id} eyebrow={data.eyebrow} title={title} intro={data.intro} />
      ) : (
        <Reveal className="mb-12 border-b border-line pb-4 md:mb-16">
          <Eyebrow>{data.eyebrow}</Eyebrow>
        </Reveal>
      )}

      {!data.people.length && (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('team.empty')}</p>
        </div>
      )}

      <div className="flex flex-col gap-24 md:gap-32">
        {groups.founders.map((p, i) => (
          <Spread
            key={p.id}
            person={p}
            level={founderIsHeading && i === 0 ? 2 : 3}
            headingId={founderIsHeading && i === 0 ? id : undefined}
            flip={i % 2 === 1}
          />
        ))}

        {(key.length > 0 || rest.length > 0) && (
          <div className="flex flex-col gap-12 md:gap-16">
            {showFilter && (
              <Filter
                label={t('team.allDivisions')}
                value={division}
                onChange={setDivision}
                options={[
                  { value: ALL, label: t('team.allDivisions') },
                  ...divisions.map(([value, label]) => ({ value, label })),
                ]}
              />
            )}
            {/* Keyed by the filter: the people that stay are shown afresh, not shuffled. */}
            <div key={division} className="flex flex-col gap-24 md:gap-32">
              {onlyOneKey && key[0] ? (
                <Spread person={key[0]} level={3} compact />
              ) : (
                key.length > 0 && <KeyPeople people={key} />
              )}
              {rest.length > 0 && <TeamRegister people={rest} />}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
