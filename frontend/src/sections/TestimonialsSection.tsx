import { type CSSProperties, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Arrow, ArrowLeft, Head, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Testimonials in a swipeable rail; a bar under it follows the scroll. */
export function TestimonialsSection({ section }: SectionProps<'testimonials'>) {
  const { t } = useTranslation()
  const d = section.data
  const rail = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLElement>(null)
  const items = d.clients.filter((c) => c.testimonial)
  useEffect(() => {
    const el = rail.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      const n = el.children.length || 1
      bar.current?.style.setProperty(
        '--p',
        String(1 / n + (1 - 1 / n) * (max ? el.scrollLeft / max : 0)),
      )
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [items.length])
  if (!items.length) return null
  const step = (dir: number) => {
    const el = rail.current
    const card = el?.querySelector('.tcard')
    if (el && card)
      el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 24), behavior: 'smooth' })
  }
  return (
    <Sec tone={section.tone} anchor={section.anchor} style={{ overflow: 'hidden' }}>
      <div className="wrap">
        <Head
          eyebrow={d.eyebrow}
          title={d.title}
          aside={
            <div className="ctas" style={{ marginTop: 0 }}>
              <button className="circ" aria-label={t('a11y.prev')} onClick={() => step(-1)}>
                <ArrowLeft />
              </button>
              <button className="circ" aria-label={t('a11y.next')} onClick={() => step(1)}>
                <Arrow />
              </button>
            </div>
          }
        />
      </div>
      <div className="rail" ref={rail}>
        {items.map((c) => (
          <figure key={c.id} className="tcard">
            <span className="tcard__ind">{c.industry_label}</span>
            <blockquote className="tcard__q">
              {t('quote.open')}
              {c.testimonial?.quote}
              {t('quote.close')}
            </blockquote>
            <figcaption className="tcard__who">
              <SmartImage media={c.logo} fill fit="contain" sizes="56px" />
              <div>
                <b>{c.testimonial?.author}</b>
                <span>{c.testimonial?.position}</span>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="wrap">
        <div className="bar" aria-hidden="true">
          <i ref={bar} style={{ '--p': 0.25 } as CSSProperties} />
        </div>
      </div>
    </Sec>
  )
}
