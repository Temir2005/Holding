import { type CSSProperties, useEffect, useRef } from 'react'
import { Head, Sec } from '@/components/site/kit'
import { reduceMotion, useInView } from '@/components/site/hooks'
import { SmartImage } from '@/components/ui/SmartImage'
import type { TimelineEvent } from '@/api/types'
import type { SectionProps } from './types'

/**
 * History: a vertical line fills while the page scrolls, events alternate sides with photos.
 * Events without photos (a launch plan) become a horizontal roadmap.
 */
export function TimelineSection({ section }: SectionProps<'timeline'>) {
  const d = section.data
  const photos = d.events.some((e) => e.image)
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
        {photos ? <History events={d.events} /> : <Roadmap events={d.events} />}
      </div>
    </Sec>
  )
}

function Roadmap({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="road" style={{ '--n': events.length } as CSSProperties}>
      {events.map((e, i) => (
        <li
          key={e.id}
          className="road__it rv"
          style={{ '--d': `${0.2 + i * 0.25}s` } as CSSProperties}
        >
          <b className="tnum">{e.year}</b>
          <h3 className="h3">{e.title}</h3>
          <p>{e.description}</p>
        </li>
      ))}
    </ol>
  )
}

function History({ events }: { events: TimelineEvent[] }) {
  const root = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const items = [...el.querySelectorAll<HTMLElement>('.ev')]
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const pen = window.innerHeight * 0.6
      const p = reduceMotion() ? 1 : Math.min(1, Math.max(0, (pen - r.top) / r.height))
      fill.current?.style.setProperty('--p', String(p))
      items.forEach((it) => {
        const b = it.getBoundingClientRect()
        it.classList.toggle('passed', b.top + b.height / 2 < pen)
      })
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])
  return (
    <div className="tl" ref={root}>
      <div className="tl__rail" aria-hidden="true">
        <span className="tl__fill" ref={fill} />
      </div>
      <ol>
        {events.map((e) => (
          <Event key={e.id} event={e} />
        ))}
      </ol>
    </div>
  )
}

function Event({ event: e }: { event: TimelineEvent }) {
  const [ref, seen] = useInView<HTMLLIElement>()
  return (
    <li ref={ref} className={seen ? 'ev in' : 'ev'}>
      <span className="ev__dot" aria-hidden="true" />
      <div className="ev__text">
        <div className="ev__year">{e.year}</div>
        <h3 className="h3 ev__title">{e.title}</h3>
        <p>{e.description}</p>
      </div>
      {e.image && (
        <div className="ev__media">
          <SmartImage media={e.image} fill sizes="(max-width: 860px) 100vw, 45vw" />
        </div>
      )}
    </li>
  )
}
