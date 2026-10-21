import { m, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Vacancy } from '@/api/types'
import { PlusMark } from '@/components/cards/PersonCard'
import { CmsLink, MoreLink } from '@/components/ui/Button'
import { Markdown } from '@/components/ui/Markdown'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT, stagger } from '@/lib/motion'
import { pad2 } from './sectionNumber'
import { REGISTER_ROW, rowTicks } from './team/trace'
import { useDisclosure } from '@/components/ui/useDisclosure'
import { headingId, type SectionProps } from './types'

/** Where «Apply» leads: the contact form of the page (its anchor in the CMS seeds). */
const APPLY_HREF = '#contacts'

/** Number | title | division | location | employment | toggle, on desktop. */
const COLS =
  'grid-cols-[2rem_minmax(0,1fr)_1.25rem] lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.45fr)_minmax(0,0.55fr)_1.25rem]'

/**
 * Open positions as a specification table: number, title, division, location and employment in
 * columns. A row unfolds into the description (Markdown) with the «Apply» button. No positions
 * is a normal state: the CMS text set large, with a way to write anyway.
 */
export function VacanciesSection({ section }: SectionProps<'vacancies'>) {
  const { data } = section
  const { t } = useTranslation()
  const id = headingId(section.id)
  const list = data.vacancies

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? id : undefined}
      branches={list.length ? rowTicks : undefined}
    >
      <SectionHeader id={id} eyebrow={data.eyebrow} title={data.title} intro={data.intro} />
      {list.length === 0 ? (
        <Reveal className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-y border-line-strong py-10 md:py-14 lg:grid-cols-[2.5rem_minmax(0,1fr)]">
          <span
            aria-hidden="true"
            className="tabular pt-[0.6em] font-mono text-caption font-medium text-fg-mute"
          >
            00
          </span>
          <div className="flex flex-col items-start gap-8 md:gap-10">
            <p className="max-w-[24ch] text-[clamp(1.625rem,1rem+2.2vw,3.5rem)] font-normal leading-[1.08] tracking-[-0.025em] [overflow-wrap:break-word]">
              {data.empty_text?.trim() || t('vacancy.empty')}
            </p>
            <MoreLink href={APPLY_HREF}>{t('vacancy.write')}</MoreLink>
          </div>
        </Reveal>
      ) : (
        <div>
          <div
            aria-hidden="true"
            className={cn('mono-label hidden gap-x-4 border-b border-fg pb-2 lg:grid', COLS)}
          >
            <span className="font-sans normal-case tracking-normal">{t('showcase.no')}</span>
            <span>{t('vacancy.colTitle')}</span>
            <span>{t('vacancy.colDivision')}</span>
            <span>{t('vacancy.colLocation')}</span>
            <span>{t('vacancy.colType')}</span>
          </div>
          <ol role="list" className="border-t border-line-strong lg:border-t-0">
            {list.map((v, i) => (
              <Row key={v.id} vacancy={v} index={i} />
            ))}
          </ol>
        </div>
      )}
    </Section>
  )
}

function Row({ vacancy: v, index }: { vacancy: Vacancy; index: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { open, panelId, buttonProps } = useDisclosure()
  const description = v.description.trim()
  const type = t(`vacancy.${v.employment_type}`)

  return (
    <Reveal as="li" delay={stagger(index)} className="relative border-b border-line">
      <div className={cn('relative grid gap-x-4 py-6 lg:items-baseline lg:py-5', COLS)}>
        <span
          aria-hidden="true"
          data-trace-anchor={REGISTER_ROW}
          className={cn(
            'tabular col-start-1 row-start-1 self-start pt-[0.5em] font-mono text-caption font-medium transition-colors duration-2 lg:self-auto lg:pt-0',
            open ? 'text-accent-ink' : 'text-fg-mute',
          )}
        >
          {pad2(index + 1)}
        </span>
        <h3 className="col-start-2 row-start-1 text-subtitle font-semibold [overflow-wrap:break-word]">
          {description ? (
            // the whole row is the hit area of the disclosure
            <button
              {...buttonProps}
              className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none [&:focus-visible>span]:outline [&:focus-visible>span]:outline-2 [&:focus-visible>span]:outline-offset-4 [&:focus-visible>span]:outline-[rgb(var(--accent-ink))]"
            >
              <span className="link-draw">{v.title}</span>
            </button>
          ) : (
            v.title
          )}
        </h3>
        <div className="col-start-2 row-start-2 mt-3 flex flex-wrap gap-x-4 gap-y-1 lg:contents">
          {v.division && (
            <span className="mono-label text-fg [overflow-wrap:break-word] lg:col-start-3 lg:row-start-1">
              {v.division.name}
            </span>
          )}
          {v.location && (
            <span className="mono-label [overflow-wrap:break-word] lg:col-start-4 lg:row-start-1">
              {v.location}
            </span>
          )}
          <span className="mono-label [overflow-wrap:break-word] lg:col-start-5 lg:row-start-1">
            {type}
          </span>
        </div>
        {description && (
          <PlusMark
            open={open}
            className="col-start-3 row-start-1 mt-[0.7em] justify-self-end lg:col-start-6 lg:mt-0 lg:self-center"
          />
        )}
      </div>

      {description ? (
        <div id={panelId} hidden={!open}>
          <m.div
            key={String(open)}
            initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            transition={{ duration: DUR.step, ease: EASE_OUT }}
            className="grid gap-8 pb-10 pl-[calc(2rem+1rem)] lg:grid-cols-12 lg:gap-x-gap lg:pl-[calc(2.5rem+1rem)]"
          >
            {/* the vacancy title is the h3 of the row: the description starts at h4 */}
            <Markdown headingFloor={4} className="lg:col-span-7">
              {description}
            </Markdown>
            <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
              <CmsLink href={APPLY_HREF}>{t('vacancy.apply')}</CmsLink>
            </div>
          </m.div>
        </div>
      ) : (
        <div className="pb-6 pl-[calc(2rem+1rem)] lg:pl-[calc(2.5rem+1rem)]">
          <CmsLink href={APPLY_HREF} variant="secondary">
            {t('vacancy.apply')}
          </CmsLink>
        </div>
      )}
    </Reveal>
  )
}
