import type { CSSProperties } from 'react'
import type { Stat } from '@/api/types'
import { CountUp } from '@/components/motion/CountUp'
import { anchor, type TraceBranches } from '@/components/trace/paths'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { type Locale, useLocale } from '@/lib/locale'
import { stagger } from '@/lib/motion'
import { pad2 } from './sectionNumber'
import { headingId, type SectionProps } from './types'

/** The line branches off the margin above the hero figure and runs to its end, like a dimension. */
const branchToHero: TraceBranches = (box) => {
  const start = anchor(box, 'stat-branch')
  const end = anchor(box, 'stat-branch-end')
  return start && end ? [{ d: `M ${box.x} ${start.y} H ${end.x}`, at: start.y }] : []
}

/**
 * Figures as the heroes of the screen.
 * - `chain` (default): the first figure is the largest object on the page, its size fitted to
 *   its length; its label sits on a dimension line to the edge. The rest follow as a chain of
 *   dimensions.
 * - `row`: one quiet row for secondary pages.
 * No figures: nothing without a heading; with one, the header alone (the block never fakes data).
 */
export function StatsSection({ section }: SectionProps<'stats'>) {
  const { data } = section
  const locale = useLocale()
  const stats = data.stats
  const hasHeader = Boolean(data.title || data.eyebrow)
  if (!stats.length && !hasHeader) return null
  const chain = data.layout !== 'row'
  const [first, ...rest] = stats

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
      branches={chain && first ? branchToHero : undefined}
    >
      {hasHeader && (
        <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      )}
      {chain && first ? (
        <>
          <HeroFigure stat={first} locale={locale} />
          {rest.length > 0 && <Chain stats={rest} locale={locale} offset={2} />}
        </>
      ) : (
        stats.length > 0 && <Chain stats={stats} locale={locale} offset={1} />
      )}
    </Section>
  )
}

/** Value with its symbol (+, %) in a thin cut and its unit (м², «дня») small at the top. */
function Value({ stat, locale, className }: { stat: Stat; locale: Locale; className?: string }) {
  const symbol = /^\s*[+%]\s*$/.test(stat.suffix)
  const unit = !symbol && stat.suffix.trim()
  return (
    <span className={cn('inline-flex items-baseline whitespace-nowrap', className)}>
      {stat.prefix && <Unit>{stat.prefix}</Unit>}
      <CountUp value={stat.value} format={(n) => formatNumber(n, locale)} />
      {symbol && <span className="ml-[0.04em] font-extralight">{stat.suffix.trim()}</span>}
      {unit && <Unit>{unit}</Unit>}
    </span>
  )
}

function Unit({ children }: { children: string }) {
  return (
    <span className="ml-[0.35em] self-start text-[max(0.875rem,0.25em)] font-medium normal-case leading-none tracking-normal text-fg-mute">
      {children}
    </span>
  )
}

function HeroFigure({ stat, locale }: { stat: Stat; locale: Locale }) {
  const chars = (formatNumber(stat.value, locale) + stat.suffix).length
  // Fitted so the figure never overflows: up to 24vw, and at most 60% of the content width.
  const style = { '--chars': chars } as CSSProperties
  return (
    <div
      style={style}
      className="stat-hero mb-[clamp(48px,6vw,96px)] grid items-end gap-y-6 md:grid-cols-[auto_minmax(0,1fr)]"
    >
      <div className="relative text-[length:var(--hs)]">
        {/* Anchors of the line's branch: it runs above the figure from the margin to its end. */}
        <span aria-hidden="true" className="relative mb-[max(16px,0.08em)] block h-4">
          <span data-trace-anchor="stat-branch" className="absolute left-0 top-0 h-px w-0" />
          <span data-trace-anchor="stat-branch-end" className="absolute right-0 top-0 h-px w-0" />
          <span className="absolute right-0 top-[-7px] h-4 w-px bg-trace" />
        </span>
        <p className="font-heading leading-[0.8] tracking-[-0.055em] tabular">
          <Value stat={stat} locale={locale} />
        </p>
      </div>
      <Reveal className="grid gap-2 md:pb-[calc(var(--hs)*0.04)] md:pl-[clamp(16px,2vw,32px)]">
        <span aria-hidden="true" className="mono-label">
          01
        </span>
        <p className="max-w-[26ch] text-[clamp(1.25rem,0.95rem+0.9vw,2rem)] leading-[1.3]">
          {stat.label}
        </p>
        <DimensionLine className="mt-2" />
      </Reveal>
    </div>
  )
}

function Chain({ stats, locale, offset }: { stats: Stat[]; locale: Locale; offset: number }) {
  return (
    <ul className="flex flex-wrap gap-y-[clamp(48px,5vw,88px)]">
      {stats.map((s, i) => (
        <Reveal
          as="li"
          key={s.id}
          delay={stagger(i)}
          className="min-w-[clamp(150px,17vw,300px)] flex-[1_1_auto] pr-gap"
        >
          <DimensionLine label={pad2(i + offset)} className="mb-6" />
          <p className="text-stat-lg font-heading tabular">
            <Value stat={s} locale={locale} />
          </p>
          <p className="mt-4 max-w-[24ch] text-fg-mute">{s.label}</p>
        </Reveal>
      ))}
    </ul>
  )
}
