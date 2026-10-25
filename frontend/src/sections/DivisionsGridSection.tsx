import { type CSSProperties, type KeyboardEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Arrow, CmsLink, Head, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import type { SectionProps } from './types'

// Each division wears its own brand colour on its tab and its button.
const COLORS: Record<string, { div: string; ink: string }> = {
  development: { div: '#F0843E', ink: '#1C1F24' },
  'smart-panels': { div: '#E31E24', ink: '#fff' },
  aaag: { div: '#5A47B8', ink: '#fff' },
}
const colorOf = (slug: string) => COLORS[slug] ?? { div: 'var(--bar)', ink: '#fff' }

/** Divisions as tabs: the photo panel of the chosen one wipes in over the previous one. */
export function DivisionsGridSection({ section }: SectionProps<'divisions_grid'>) {
  const { t } = useTranslation()
  const locale = useLocale()
  const d = section.data
  const [cur, setCur] = useState(0)
  const [was, setWas] = useState<number | null>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  if (!d.divisions.length) return null

  const select = (i: number) => {
    if (i === cur) return
    setWas(cur)
    setCur(i)
  }
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = d.divisions.length
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? (i + 1) % n
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? (i - 1 + n) % n
          : -1
    if (next < 0) return
    e.preventDefault()
    select(next)
    tabs.current[next]?.focus()
  }

  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
        <div className="dir__grid">
          <div className="tabs" role="tablist" aria-orientation="vertical">
            {d.divisions.map((div, i) => (
              <button
                key={div.id}
                ref={(el) => (tabs.current[i] = el)}
                role="tab"
                id={`tab-${section.id}-${i}`}
                aria-controls={`panel-${section.id}-${i}`}
                aria-selected={i === cur}
                tabIndex={i === cur ? 0 : -1}
                className="tab"
                style={{ '--div': colorOf(div.slug).div } as CSSProperties}
                onClick={() => select(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className="tab__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="tab__name">{div.name}</span>
                <span className="tab__tag">
                  <span>{div.tagline}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="stage">
            {d.divisions.map((div, i) => {
              const stat = div.stats[0]
              const c = colorOf(div.slug)
              const href = div.page_slug ?? div.website_url
              return (
                <div
                  key={div.id}
                  id={`panel-${section.id}-${i}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${section.id}-${i}`}
                  hidden={i !== cur && i !== was}
                  className={i === cur ? 'panel on' : i === was ? 'panel was' : 'panel'}
                  style={{ '--div': c.div, '--div-ink': c.ink } as CSSProperties}
                >
                  <div className="panel__bg">
                    <SmartImage media={div.cover} fill sizes="(max-width: 900px) 100vw, 58vw" />
                  </div>
                  <div className="panel__cap">
                    {stat ? (
                      <div className="panel__stat">
                        <b>
                          {formatNumber(stat.value, locale)}
                          {stat.suffix}
                        </b>
                        <span>{stat.label}</span>
                      </div>
                    ) : (
                      <span />
                    )}
                    {href && (
                      <CmsLink href={href} className="btn">
                        {t('ui.toDivision')}
                        <Arrow />
                      </CmsLink>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Sec>
  )
}
