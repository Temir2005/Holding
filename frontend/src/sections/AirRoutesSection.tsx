import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Head, Sec } from '@/components/site/kit'
import { reduceMotion, useInView } from '@/components/site/hooks'
import { MapFrame } from '@/components/site/MapFrame'
import { distanceKm } from '@/lib/geo'
import type { SectionProps } from './types'

const FLIGHT = 2400

/**
 * Air routes on the real map of Almaty: choosing a route draws the line, an aircraft dot flies
 * along it, and the time and distance count up. Time = straight-line distance at cruise speed.
 */
export function AirRoutesSection({ section }: SectionProps<'air_routes'>) {
  const { t } = useTranslation()
  const d = section.data
  const points = new Map(d.points.map((p) => [p.key, p]))
  const routes = d.routes.filter((r) => points.has(r.from_key) && points.has(r.to_key))
  const [cur, setCur] = useState(0)
  const [ref, seen] = useInView<HTMLDivElement>('0px 0px -20% 0px')
  const line = useRef<SVGLineElement>(null)
  const dot = useRef<SVGGElement>(null)
  const [shown, setShown] = useState({ min: 0, km: 0 })

  const route = routes[cur]
  const a = route && points.get(route.from_key)
  const b = route && points.get(route.to_key)
  const km = a && b ? distanceKm([a.lat, a.lon], [b.lat, b.lon]) : 0
  const minutes = (km / d.speed_kmh) * 60

  useEffect(() => {
    if (!seen || !a || !b) return
    const ln = line.current
    const x1 = Number(ln?.getAttribute('x1'))
    const y1 = Number(ln?.getAttribute('y1'))
    const x2 = Number(ln?.getAttribute('x2'))
    const y2 = Number(ln?.getAttribute('y2'))
    if (reduceMotion()) {
      setShown({ min: minutes, km })
      dot.current?.setAttribute('transform', `translate(${x2} ${y2})`)
      return
    }
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (ln) {
      ln.style.strokeDasharray = String(len)
      ln.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration: FLIGHT,
        easing: 'cubic-bezier(.77,0,.175,1)',
        fill: 'both',
      })
    }
    let raf = 0
    const t0 = performance.now()
    const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / FLIGHT)
      const e = ease(p)
      dot.current?.setAttribute(
        'transform',
        `translate(${x1 + (x2 - x1) * e} ${y1 + (y2 - y1) * e})`,
      )
      const c = 1 - Math.pow(1 - p, 3)
      setShown({ min: minutes * c, km: km * c })
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, cur])

  if (!routes.length || !d.bounds) return null
  const bounds = d.bounds
  const nameOf = (key: string) => points.get(key)?.name ?? key
  const angle = (x1: number, y1: number, x2: number, y2: number) =>
    (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI

  return (
    <Sec tone="dark" anchor={section.anchor}>
      <div className="wrap routes__grid">
        <div>
          <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} className="" />
          <div className="routes__list" role="group" aria-label={t('ui.routes')}>
            {routes.map((r, i) => (
              <button
                key={`${r.from_key}-${r.to_key}`}
                className="route"
                aria-pressed={i === cur}
                onClick={() => setCur(i)}
              >
                <b>
                  {nameOf(r.from_key)} → {nameOf(r.to_key)}
                </b>
                <span>{r.text}</span>
              </button>
            ))}
          </div>
        </div>
        <div ref={ref} className="routes__wrap">
          <MapFrame
            map={d.map}
            bounds={bounds}
            attribution={d.attribution}
            className="routes__map pmap__map"
            label={d.title ?? ''}
          >
            {(at) => {
              const [x1, y1] = a ? at(a.lat, a.lon) : [0, 0]
              const [x2, y2] = b ? at(b.lat, b.lon) : [0, 0]
              return (
                <>
                  {routes.map((r, i) => {
                    if (i === cur) return null
                    const p = points.get(r.from_key)
                    const q = points.get(r.to_key)
                    if (!p || !q) return null
                    const [px, py] = at(p.lat, p.lon)
                    const [qx, qy] = at(q.lat, q.lon)
                    return <line key={i} className="r-ghost" x1={px} y1={py} x2={qx} y2={qy} />
                  })}
                  <line key={cur} ref={line} className="r-line" x1={x1} y1={y1} x2={x2} y2={y2} />
                  {d.points.map((p) => {
                    const [x, y] = at(p.lat, p.lon)
                    const on = p.key === route?.from_key || p.key === route?.to_key
                    return (
                      <g key={p.key}>
                        <circle
                          className={on ? 'r-pt r-pt--on' : 'r-pt'}
                          cx={x}
                          cy={y}
                          r={on ? 9 : 5}
                        />
                        <text className={on ? 'lbl' : 'lbl lbl--soft'} x={x + 14} y={y + 5}>
                          {p.name}
                        </text>
                      </g>
                    )
                  })}
                  <g ref={dot} transform={`translate(${x1} ${y1})`} aria-hidden="true">
                    <g transform={`rotate(${angle(x1, y1, x2, y2)})`}>
                      <circle r="16" fill="var(--bar)" opacity=".35" />
                      <path
                        d="M-9 -2 L4 -2 L10 0 L4 2 L-9 2 Z M-2 -9 L1 -9 L3 9 L0 9 Z"
                        fill="#fff"
                      />
                    </g>
                  </g>
                </>
              )
            }}
          </MapFrame>
          <div className="routes__hud" aria-live="polite">
            <div>
              <b>{t('ui.minutes', { count: Math.max(1, Math.round(shown.min)) })}</b>
              <span>{t('ui.estimatedTime')}</span>
            </div>
            <div>
              <b>{t('ui.km', { count: Math.round(shown.km) })}</b>
              <span>{t('ui.straight')}</span>
            </div>
          </div>
        </div>
      </div>
    </Sec>
  )
}
