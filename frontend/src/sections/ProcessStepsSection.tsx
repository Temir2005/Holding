import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Arrow, CmsLink, Head, Sec } from '@/components/site/kit'
import { reduceMotion } from '@/components/site/hooks'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

const DIV_COLOR: Record<string, string> = {
  'smart-panels': '#E31E24',
  aaag: '#5A47B8',
  development: '#F0843E',
}

const pad = (i: number) => String(i).padStart(2, '0')

/**
 * The full cycle. On desktop the block pins under the header and the page scroll walks the
 * steps: the list slides up so the current step sits in the middle (the others dim), and the
 * photos in the panel slide sideways to the step's one while the counter rolls to the next
 * number. On phones every step is a plain item that rises into view with its photo.
 * A step that belongs to another division carries its colour and links to it.
 */
export function ProcessStepsSection({ section }: SectionProps<'process_steps'>) {
  const d = section.data
  const n = d.steps.length
  const stage = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const [cur, setCur] = useState(0)

  useEffect(() => {
    const st = stage.current
    const ol = list.current
    if (!st || !ol || !n) return
    const items = Array.from(ol.children) as HTMLElement[]
    const desktop = window.matchMedia('(min-width: 861px)')
    let raf = 0

    // where the list has to sit for step i to be in the middle, without leaving a gap
    // above the first step or below the last one
    const yFor = (i: number) => {
      const box = ol.parentElement?.clientHeight ?? 0
      const it = items[i]
      if (!it) return 0
      const centered = box / 2 - (it.offsetTop + it.offsetHeight / 2)
      const lowest = Math.min(0, box - ol.scrollHeight)
      return Math.max(lowest, Math.min(0, centered))
    }

    const update = () => {
      raf = 0
      if (!desktop.matches) {
        ol.style.transform = ''
        return
      }
      const r = st.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
      const f = p * (n - 1)
      const i0 = Math.floor(f)
      const i1 = Math.min(n - 1, i0 + 1)
      const y = yFor(i0) + (yFor(i1) - yFor(i0)) * (f - i0)
      ol.style.transform = `translateY(${y.toFixed(1)}px)`
      setCur(Math.round(f))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    // phones: each step rises once it scrolls into view
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('seen')),
            { rootMargin: '0px 0px -15% 0px' },
          )
    items.forEach((it) => (io ? io.observe(it) : it.classList.add('seen')))
    if (reduceMotion()) items.forEach((it) => it.classList.add('seen'))

    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [n])

  if (!n) return null

  return (
    <Sec tone={section.tone} anchor={section.anchor} className="cyc">
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
      </div>
      <div ref={stage} className="cyc__stage" style={{ '--n': n } as CSSProperties}>
        <div className="cyc__pin wrap">
          <div className="cyc__steps">
            <ol ref={list}>
              {d.steps.map((s, i) => (
                <li
                  key={i}
                  className={i === cur ? 'cyc__step on' : 'cyc__step'}
                  aria-current={i === cur ? 'step' : undefined}
                  style={
                    s.division
                      ? ({ '--div': DIV_COLOR[s.division.slug] ?? 'var(--bar)' } as CSSProperties)
                      : undefined
                  }
                >
                  <div className="cyc__n">
                    {pad(i + 1)}
                    {s.division && <span className="cyc__tag">{s.division.name}</span>}
                  </div>
                  <h3 className="cyc__h">{s.title}</h3>
                  <p>{s.text}</p>
                  {s.division?.page_slug && (
                    <CmsLink href={s.division.page_slug} className="btn btn--ink cyc__btn">
                      {s.division.name}
                      <Arrow />
                    </CmsLink>
                  )}
                  {s.media && (
                    <div className="cyc__ph">
                      <SmartImage media={s.media} fill sizes="100vw" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="cyc__panel" aria-hidden="true">
            <div className="cyc__shots">
              <div className="cyc__track" style={{ '--cur': cur } as CSSProperties}>
                {d.steps.map((s, i) => (
                  <div
                    key={i}
                    className={i === cur ? 'cyc__shot on' : 'cyc__shot'}
                    style={{ '--o': i - cur } as CSSProperties}
                  >
                    <SmartImage
                      media={s.media}
                      fill
                      eager
                      sizes="(max-width: 1440px) 55vw, 800px"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="cyc__foot">
              <span className="cyc__roll">
                <span style={{ transform: `translateY(${-cur}em)` }}>
                  {d.steps.map((_, i) => (
                    <b key={i}>{pad(i + 1)}</b>
                  ))}
                </span>
              </span>
              <span>/ {pad(n)}</span>
              <span className="cyc__bar">
                <i style={{ transform: `scaleX(${(cur + 1) / n})` }} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Sec>
  )
}
