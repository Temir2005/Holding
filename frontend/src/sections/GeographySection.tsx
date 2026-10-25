import { useEffect, useRef, useState } from 'react'
import { Head, Sec } from '@/components/site/kit'
import { reduceMotion, useInView } from '@/components/site/hooks'
import { MapFrame } from '@/components/site/MapFrame'
import type { SectionProps } from './types'

/** Supply map: arcs from the warehouse to each country draw one after another. */
export function GeographySection({ section }: SectionProps<'geography'>) {
  const d = section.data
  const [ref, seen] = useInView<HTMLDivElement>('0px 0px -25% 0px')
  const [lit, setLit] = useState(0)
  const arcs = useRef<(SVGPathElement | null)[]>([])
  const placed = d.countries.filter((c) => c.lat != null && c.lon != null)
  const canDraw = d.bounds && d.origin_lat != null && d.origin_lon != null

  useEffect(() => {
    if (!seen) return
    if (reduceMotion()) {
      setLit(placed.length)
      return
    }
    const timers: number[] = []
    arcs.current.forEach((path, i) => {
      if (!path) return
      const len = path.getTotalLength()
      path.style.strokeDasharray = String(len)
      path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration: 900,
        delay: 300 + i * 450,
        easing: 'cubic-bezier(.77,0,.175,1)',
        fill: 'backwards',
      })
      timers.push(window.setTimeout(() => setLit(i + 1), 300 + i * 450 + 900))
    })
    return () => timers.forEach(clearTimeout)
  }, [seen, placed.length])

  return (
    <Sec tone="dark" anchor={section.anchor}>
      <div className="wrap geo__grid">
        <div>
          <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} className="" />
          <ul className="geo__list">
            {d.countries.map((c) => {
              const i = placed.indexOf(c)
              return (
                <li key={c.code} className={i > -1 && i < lit ? 'lit' : undefined}>
                  <i aria-hidden="true" />
                  {c.name}
                  {c.note && <span className="muted"> · {c.note}</span>}
                </li>
              )
            })}
          </ul>
        </div>
        <div ref={ref}>
          {canDraw && d.bounds && (
            <MapFrame map={d.map} bounds={d.bounds} className="geo__map" label={d.title ?? ''}>
              {(at) => {
                const [ox, oy] = at(d.origin_lat ?? 0, d.origin_lon ?? 0)
                return (
                  <>
                    {placed.map((c, i) => {
                      const [x, y] = at(c.lat ?? 0, c.lon ?? 0)
                      const mx = (ox + x) / 2
                      const my = Math.min(oy, y) - Math.abs(x - ox) * 0.25 - 20
                      return (
                        <g key={c.code}>
                          <path
                            ref={(el) => (arcs.current[i] = el)}
                            className="arc"
                            d={`M${ox} ${oy} Q${mx} ${my} ${x} ${y}`}
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r={i < lit ? 7 : 5}
                            fill={i < lit ? 'var(--bar)' : 'rgba(255,255,255,.5)'}
                            style={{ transition: 'r .3s, fill .3s' }}
                          />
                          <text className="lbl" x={x + 12} y={y + 5}>
                            {c.name}
                          </text>
                        </g>
                      )
                    })}
                    <circle cx={ox} cy={oy} r={9} fill="#fff" stroke="var(--bar)" strokeWidth={4} />
                    <text className="lbl" x={ox + 14} y={oy + 24}>
                      {d.origin}
                    </text>
                  </>
                )
              }}
            </MapFrame>
          )}
        </div>
      </div>
    </Sec>
  )
}
