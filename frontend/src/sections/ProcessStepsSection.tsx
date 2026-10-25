import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Arrow, CmsLink, Eyebrow, Sec } from '@/components/site/kit'
import { reduceMotion } from '@/components/site/hooks'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

const DIV_COLOR: Record<string, string> = {
  'smart-panels': '#E31E24',
  aaag: '#5A47B8',
  development: '#F0843E',
}

/**
 * The full cycle: the block pins to the screen and scrolling walks the track from step to step;
 * text and photo change with the step. A step that belongs to another division is drawn in its
 * colour and links to it. On phones it is a plain list.
 */
export function ProcessStepsSection({ section }: SectionProps<'process_steps'>) {
  const d = section.data
  const n = d.steps.length
  const root = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const [cur, setCur] = useState(0)

  useEffect(() => {
    const el = root.current
    if (!el || !n) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
      fill.current?.style.setProperty('--p', String(reduceMotion() ? (cur + 1) / n : p))
      setCur(Math.min(n - 1, Math.floor(p * n + 0.02)))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  if (!n) return null
  const jump = (i: number) => {
    const el = root.current
    if (!el) return
    const span = el.offsetHeight - window.innerHeight
    window.scrollTo({
      top: el.offsetTop + (span * (i + 0.5)) / n,
      behavior: reduceMotion() ? 'auto' : 'smooth',
    })
  }

  return (
    <Sec
      tone={section.tone}
      anchor={section.anchor}
      bare
      className="cyc"
      style={{ '--n': n } as CSSProperties}
    >
      <div ref={root} style={{ height: '100%' }}>
        <div className="cyc__pin">
          <div className="wrap" style={{ width: '100%' }}>
            <Eyebrow>{d.eyebrow}</Eyebrow>
            {d.title && <h2 className="h2">{d.title}</h2>}
            <div className="track" style={{ '--n': n } as CSSProperties}>
              <div className="track__line" aria-hidden="true">
                <span className="track__fill" ref={fill} />
              </div>
              {d.steps.map((s, i) => (
                <button
                  key={i}
                  className={[
                    'node',
                    i <= cur && 'done',
                    i === cur && 'cur',
                    s.division && 'node--div',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    s.division
                      ? ({ '--div': DIV_COLOR[s.division.slug] ?? 'var(--bar)' } as CSSProperties)
                      : undefined
                  }
                  aria-current={i === cur ? 'step' : undefined}
                  onClick={() => jump(i)}
                >
                  <i aria-hidden="true" />
                  {s.title}
                </button>
              ))}
            </div>
            <div className="cyc__body">
              <div className="steps-txt">
                {d.steps.map((s, i) => (
                  <div
                    key={i}
                    className={i === cur ? 'step-txt on' : 'step-txt'}
                    aria-hidden={i !== cur}
                  >
                    <b>{String(i + 1).padStart(2, '0')}</b>
                    <h3 className="h3">{s.title}</h3>
                    <p>{s.text}</p>
                    {s.division?.page_slug && (
                      <CmsLink
                        href={s.division.page_slug}
                        className="btn"
                        {...(i !== cur ? { tabIndex: -1 } : {})}
                      >
                        {s.division.name}
                        <Arrow />
                      </CmsLink>
                    )}
                  </div>
                ))}
              </div>
              <div className="shots" aria-hidden="true">
                {d.steps.map((s, i) => (
                  <div key={i} className={i === cur ? 'shot on' : 'shot'}>
                    <SmartImage media={s.media} fill sizes="(max-width: 860px) 100vw, 55vw" />
                  </div>
                ))}
              </div>
            </div>
            <ol className="cyc__list">
              {d.steps.map((s, i) => (
                <li key={i}>
                  {s.media && (
                    <div className="ph">
                      <SmartImage media={s.media} fill sizes="100vw" />
                    </div>
                  )}
                  <b className="muted">{String(i + 1).padStart(2, '0')}</b>
                  <h3 className="h3">{s.title}</h3>
                  <p>{s.text}</p>
                  {s.division?.page_slug && (
                    <CmsLink href={s.division.page_slug} className="btn btn--accent">
                      {s.division.name}
                      <Arrow />
                    </CmsLink>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Sec>
  )
}
