import { m, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Person } from '@/api/types'
import { PlusMark } from '@/components/cards/PersonCard'
import { Frame } from '@/components/ui/Frame'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT, stagger } from '@/lib/motion'
import { pad2 } from '../sectionNumber'
import { REGISTER_ROW } from './trace'
import { useDisclosure } from '@/components/ui/useDisclosure'

/** Number | name | position | division | toggle: shared by the head row and the rows on desktop. */
const COLS =
  'grid-cols-[2rem_minmax(0,1fr)_1.25rem] lg:grid-cols-[2.5rem_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)_1.25rem]'

/**
 * The wider team as a dense register: name, position, division on one line each, no portraits.
 * A row with a bio is a disclosure (click, Enter, tap). On desktop a small sticky sheet beside
 * the register follows hover and focus with the portrait and the bio of the person.
 */
export function TeamRegister({ people }: { people: Person[] }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  const current = people[active] ?? people[0]
  // a sticky sheet beside one or two rows would outweigh them
  const preview = people.length >= 3 && people.some((p) => p.photo || p.bio.trim())

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-gap">
      <div className={preview ? 'lg:col-span-8' : 'lg:col-span-12'}>
        <div
          aria-hidden="true"
          className={cn('mono-label hidden gap-x-4 border-b border-fg pb-2 lg:grid', COLS)}
        >
          <span className="font-sans normal-case tracking-normal">{t('showcase.no')}</span>
          <span>{t('team.colName')}</span>
          <span>{t('team.colPosition')}</span>
          <span>{t('team.colDivision')}</span>
        </div>
        <ol role="list" className="border-t border-line lg:border-t-0">
          {people.map((p, i) => (
            <Row
              key={p.id}
              person={p}
              index={i}
              active={preview && i === active}
              onActivate={() => setActive(i)}
            />
          ))}
        </ol>
      </div>

      {/* A visual echo of the active row for pointer users; the rows carry the same content. */}
      {preview && current && (
        <div
          aria-hidden="true"
          className="sticky top-[calc(var(--header-h)+2rem)] hidden self-start lg:col-span-3 lg:col-start-10 lg:block"
        >
          <Frame>
            <div className="relative aspect-[4/5] w-full">
              {people.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-3',
                    i === active ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  <SmartImage media={p.photo} fill sizes="(min-width: 1024px) 22vw, 1px" />
                </div>
              ))}
            </div>
          </Frame>
          <div key={current.id} className="mt-6 flex flex-col gap-2">
            <p className="mono-label flex gap-3 text-fg">
              <span className="text-accent-ink">{pad2(active + 1)}</span>
              <span className="[overflow-wrap:break-word]">{current.full_name}</span>
            </p>
            {current.bio.trim() && (
              <p className="text-[0.9375rem] leading-normal text-fg-mute [overflow-wrap:break-word]">
                {current.bio}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type RowProps = { person: Person; index: number; active: boolean; onActivate: () => void }

function Row({ person: p, index, active, onActivate }: RowProps) {
  const bio = p.bio.trim()
  const reduce = useReducedMotion()
  const { open, panelId, buttonProps } = useDisclosure()

  const cells = (
    <>
      <span
        aria-hidden="true"
        data-trace-anchor={REGISTER_ROW}
        className={cn(
          'tabular col-start-1 row-start-1 self-start pt-[0.35em] font-mono text-caption font-medium transition-colors duration-2',
          active || open ? 'text-accent-ink' : 'text-fg-mute',
        )}
      >
        {pad2(index + 1)}
      </span>
      <span className="col-start-2 row-start-1 text-lg font-medium leading-snug [overflow-wrap:break-word]">
        {p.full_name}
      </span>
      {p.position && (
        <span className="mono-label col-start-2 row-start-2 mt-2 text-fg [overflow-wrap:break-word] lg:col-start-3 lg:row-start-1 lg:mt-0 lg:pt-[0.45em]">
          {p.position}
        </span>
      )}
      {p.division && (
        <span className="mono-label col-start-2 row-start-3 mt-1 [overflow-wrap:break-word] lg:col-start-4 lg:row-start-1 lg:mt-0 lg:pt-[0.45em]">
          {p.division.name}
        </span>
      )}
    </>
  )

  return (
    <Reveal
      as="li"
      delay={stagger(index)}
      className={cn(
        'relative border-b border-line',
        // the row is lifted on the second tone while it drives the preview (desktop)
        'before:absolute before:inset-y-0 before:-inset-x-4 before:-z-10 before:hidden before:bg-surface-2 before:opacity-0 before:transition-opacity before:duration-2 lg:before:block',
        active && 'before:opacity-100',
      )}
    >
      <div onPointerEnter={onActivate} onFocus={onActivate}>
        {bio ? (
          <button
            {...buttonProps}
            className={cn('grid w-full gap-x-4 py-5 text-left lg:py-4', COLS)}
          >
            {cells}
            <PlusMark
              open={open}
              className="col-start-3 row-start-1 mt-[0.55em] justify-self-end lg:col-start-5"
            />
          </button>
        ) : (
          <div className={cn('grid gap-x-4 py-5 lg:py-4', COLS)}>{cells}</div>
        )}
        {bio && (
          <div
            id={panelId}
            hidden={!open}
            className="pb-6 pl-[calc(2rem+1rem)] lg:pl-[calc(2.5rem+1rem)]"
          >
            <m.p
              key={String(open)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
              transition={{ duration: DUR.step, ease: EASE_OUT }}
              className="max-w-[60ch] text-[0.9375rem] leading-normal text-fg-mute [overflow-wrap:break-word]"
            >
              {bio}
            </m.p>
          </div>
        )}
      </div>
    </Reveal>
  )
}
