import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Person } from '@/api/types'
import { PersonCard } from '@/components/cards/PersonCard'
import { Filter } from '@/components/ui/Filter'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { headingId, type SectionProps } from './types'

/** Pick 3 or 4 columns so the last row is full whenever possible. */
const leaderCols = (n: number) => (n % 3 === 0 && n % 4 !== 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4')

export function TeamGridSection({ section }: SectionProps<'team_grid'>) {
  const { data } = section
  if (!data.people.length) return null
  const header = <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

  if (data.mode === 'founder' && data.people[0]) {
    return (
      <Section tone={section.tone} anchor={section.anchor}>
        <Founder person={data.people[0]} eyebrow={data.eyebrow} />
      </Section>
    )
  }
  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={data.title ? headingId(section.id) : undefined}>
      {header}
      {/* Leaders get large cards with a bio dialog; the wider team a compact grid. */}
      {data.mode !== 'rest' ? (
        <KeyPeople people={data.people} />
      ) : (
        <PeopleGrid people={data.people} withFilter={data.show_division_filter} />
      )}
    </Section>
  )
}

function Founder({ person, eyebrow }: { person: Person; eyebrow?: string | null }) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-14">
      <Reveal className="md:col-span-5">
        <SmartImage media={person.photo} className="aspect-[4/5] rounded-tile" crop sizes="(min-width: 768px) 40vw, 100vw" />
      </Reveal>
      <Reveal delay={0.1} className="flex flex-col gap-5 md:col-span-7">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="text-hero">{person.full_name}</h2>
        <p className="text-lead text-accent-ink">{person.position}</p>
        <p className="max-w-prose text-lead text-fg-mute">{person.bio}</p>
      </Reveal>
    </div>
  )
}

function KeyPeople({ people }: { people: Person[] }) {
  const [open, setOpen] = useState<Person | null>(null)
  return (
    <>
      <ul className={cn('grid grid-cols-2 gap-x-4 gap-y-10', leaderCols(people.length))}>
        {people.map((p, i) => (
          <Reveal as="li" key={p.id} delay={stagger(i % 4)}>
            <PersonCard person={p} onOpen={() => setOpen(p)} />
          </Reveal>
        ))}
      </ul>
      <PersonDialog person={open} onClose={() => setOpen(null)} />
    </>
  )
}

function PeopleGrid({ people, withFilter }: { people: Person[]; withFilter: boolean }) {
  const { t } = useTranslation()
  const [division, setDivision] = useState('all')
  const divisions = useMemo(() => {
    const map = new Map<string, string>()
    people.forEach((p) => p.division && map.set(p.division.slug, p.division.name))
    return [...map]
  }, [people])
  const visible = division === 'all' ? people : people.filter((p) => p.division?.slug === division)

  return (
    <div className="flex flex-col gap-8">
      {withFilter && divisions.length > 1 && (
        <Filter
          label={t('team.allDivisions')}
          value={division}
          onChange={setDivision}
          options={[
            { value: 'all', label: t('team.allDivisions') },
            ...divisions.map(([value, label]) => ({ value, label })),
          ]}
        />
      )}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((p, i) => (
          <Reveal as="li" key={p.id} delay={stagger(i % 5)}>
            <PersonCard person={p} compact />
          </Reveal>
        ))}
      </ul>
    </div>
  )
}

/** Native <dialog>: focus trap, Esc to close and inert background come for free. */
function PersonDialog({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (person && !dialog.open) dialog.showModal()
    if (!person && dialog.open) dialog.close()
  }, [person])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="tone-dark w-[min(56rem,calc(100vw-2rem))] rounded-tile p-0 text-fg backdrop:bg-black/60"
      aria-labelledby="person-dialog-title"
    >
      {person && (
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[18rem_1fr] md:p-8">
          <SmartImage media={person.photo} className="aspect-[4/5] rounded-tile" crop sizes="18rem" />
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="person-dialog-title" className="text-h2">{person.full_name}</h2>
                <p className="text-accent-ink">{person.position}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-full border border-line px-4 text-sm hover:border-fg/60"
              >
                {t('common.close')}
              </button>
            </div>
            <p className="eyebrow mt-2">{t('team.bio')}</p>
            <p className="text-fg-mute">{person.bio}</p>
            {person.linkedin_url && (
              <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-fit text-accent-ink underline underline-offset-4">
                LinkedIn
              </a>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
