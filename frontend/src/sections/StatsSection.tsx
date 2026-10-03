import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { type Locale, useLocale } from '@/lib/locale'
import { headingId, type SectionProps } from './types'

const COLS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-3 lg:grid-cols-6',
}

export function StatsSection({ section }: SectionProps<'stats'>) {
  const { data } = section
  const locale = useLocale()
  if (!data.stats.length) return null
  return (
    <Section tone={section.tone} anchor={section.anchor} className="!py-0" labelledBy={data.title ? headingId(section.id) : undefined}>
      {(data.title || data.eyebrow) && (
        <div className="pt-16 md:pt-24">
          <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
        </div>
      )}
      <dl className={cn('grid grid-cols-2', COLS[data.stats.length] ?? 'md:grid-cols-4')}>
        {data.stats.map((s) => (
          <div
            key={s.id}
            className="flex flex-col-reverse justify-end gap-2 border-b border-line py-8 max-md:[&:last-child:nth-child(odd)]:col-span-2 pr-4 md:border-b-0 md:border-r md:py-10 md:pl-6 md:first:pl-0 md:last:border-r-0"
          >
            <dt className="text-sm text-fg-mute">{s.label}</dt>
            <dd className="tabular font-display text-stat font-extrabold">
              {s.prefix}
              <Counter value={s.value} locale={locale} />
              {s.suffix && <span className="ml-1 text-[0.55em] text-accent-ink">{s.suffix}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function Counter({ value, locale }: { value: number; locale: Locale }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)

  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) setShown(value)
      return
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => setShown(v),
    })
    return () => controls.stop()
  }, [inView, reduce, value])

  return (
    <span ref={ref}>
      <span aria-hidden="true">{formatNumber(Number.isInteger(value) ? Math.round(shown) : shown, locale)}</span>
      <span className="sr-only">{formatNumber(value, locale)}</span>
    </span>
  )
}
