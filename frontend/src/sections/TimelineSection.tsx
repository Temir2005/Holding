import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Head, Sec } from '@/components/site/kit'
import { reduceMotion, useInView } from '@/components/site/hooks'
import { SmartImage } from '@/components/ui/SmartImage'
import type { TimelineEvent } from '@/api/types'
import type { SectionProps } from './types'

/**
 * History: a vertical line fills while the page scrolls, events alternate sides with photos.
 * Events without photos (a launch plan) become a roadmap a craft flies along.
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

/** A year whose digits roll up one after another. */
function Year({ value }: { value: number }) {
  const s = String(value)
  return (
    <>
      <span className="yr" aria-hidden="true">
        {[...s].map((ch, i) => (
          <span key={i} style={{ '--k': i } as CSSProperties}>
            <span>{ch}</span>
          </span>
        ))}
      </span>
      <span className="sr-only">{s}</span>
    </>
  )
}

// the craft's flight: easeInOutCubic, the same curve as --fly in CSS
const FLY_S = 2.6
const fly = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const flyInverse = (x: number) => {
  let lo = 0
  let hi = 1
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2
    if (fly(mid) < x) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Launch plan. Once on screen a glowing craft flies along the line up to this year's milestone,
 * the solid line follows it and the rest of the route stays dashed. Each milestone lights up
 * the moment the craft passes it (a ping, the year rolls in, the text rises); milestones ahead
 * appear after it lands, and the craft keeps pulsing over the current one.
 */
function Roadmap({ events }: { events: TimelineEvent[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [go, setGo] = useState(false)
  const [armed, setArmed] = useState(false)
  const now = new Date().getFullYear()
  let reach = -1
  events.forEach((e, i) => {
    if (e.year <= now) reach = i
  })
  const allPast = events.length > 0 && events.every((e) => e.year < now)

  useEffect(() => {
    const ol = ref.current
    if (!ol || reduceMotion()) return
    setArmed(true)
    const items = Array.from(ol.querySelectorAll<HTMLElement>('.road__it'))
    const vertical = window.matchMedia('(max-width: 860px)')
    const place = () => {
      const size = vertical.matches ? ol.clientHeight : ol.clientWidth
      const at = (el: HTMLElement) => (vertical.matches ? el.offsetTop : el.offsetLeft) / size
      const to = allPast ? 1 : reach < 0 ? 0 : at(items[reach] ?? ol)
      ol.style.setProperty('--to', to.toFixed(4))
      items.forEach((el, i) => {
        const x = at(el)
        const d =
          i <= reach && to > 0
            ? FLY_S * flyInverse(Math.min(1, x / to))
            : FLY_S + (i - reach) * 0.18
        el.style.setProperty('--d', `${d.toFixed(3)}s`)
      })
    }
    place()
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setGo(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -25% 0px' },
    )
    io.observe(ol)
    window.addEventListener('resize', place)
    vertical.addEventListener('change', place)
    return () => {
      io.disconnect()
      window.removeEventListener('resize', place)
      vertical.removeEventListener('change', place)
    }
  }, [reach, allPast])

  return (
    <div
      ref={ref}
      className={['road', armed && 'arm', go && 'go'].filter(Boolean).join(' ')}
      style={{ '--n': events.length, '--fly': `${FLY_S}s` } as CSSProperties}
    >
      <div className="road__line" aria-hidden="true">
        <span className="road__fill" />
        <span className="road__craft" />
      </div>
      <ol className="road__list">
        {events.map((e, i) => (
          <li
            key={e.id}
            className={[
              'road__it',
              e.year < now && 'done',
              i === reach && e.year === now && 'now',
              i > reach && 'ahead',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="road__dot" aria-hidden="true" />
            <b className="road__year">
              <Year value={e.year} />
            </b>
            <h3 className="h3">{e.title}</h3>
            <p>{e.description}</p>
          </li>
        ))}
      </ol>
    </div>
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

/** One history event: the photo slides in from its side and settles, the year rolls in. */
function Event({ event: e }: { event: TimelineEvent }) {
  const [ref, seen] = useInView<HTMLLIElement>('0px 0px -20% 0px')
  return (
    <li ref={ref} className={seen ? 'ev in' : 'ev'}>
      <span className="ev__dot" aria-hidden="true" />
      <div className="ev__text">
        <div className="ev__year">
          <Year value={e.year} />
        </div>
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
