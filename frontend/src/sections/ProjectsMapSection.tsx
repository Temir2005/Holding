import { type CSSProperties, useState } from 'react'
import { Arrow, Head, Sec } from '@/components/site/kit'
import { MapFrame } from '@/components/site/MapFrame'
import { SmartImage } from '@/components/ui/SmartImage'
import { SiteLink } from '@/components/ui/SiteLink'
import { pagePath, useLocale } from '@/lib/locale'
import type { SectionProps } from './types'

/** Projects on the real map: pins drop in; a pin and its card light up together. */
export function ProjectsMapSection({ section }: SectionProps<'projects_map'>) {
  const locale = useLocale()
  const d = section.data
  const pins = d.pins.filter((p) => p.project)
  const [cur, setCur] = useState(0)
  const bounds = d.bounds
  return (
    <Sec tone="dark" anchor={section.anchor}>
      <div className="wrap pmap__grid">
        <div>
          <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} className="" />
          <ul className="pmap__list">
            {pins.map((p, i) =>
              p.project ? (
                <li key={p.project.id} className={i === cur ? 'pmap__item on' : 'pmap__item'}>
                  <button className="pmap__sel" aria-pressed={i === cur} onClick={() => setCur(i)}>
                    <SmartImage media={p.project.cover} fill sizes="72px" />
                    <span>
                      <b>{p.project.title}</b>
                      <span>{p.note ?? p.project.short_description}</span>
                    </span>
                  </button>
                  <SiteLink
                    to={pagePath(locale, `projects/${p.project.slug}`)}
                    className="circ"
                    aria-label={p.project.title}
                  >
                    <Arrow />
                  </SiteLink>
                </li>
              ) : null,
            )}
          </ul>
          {d.note && <p className="pmap__note">{d.note}</p>}
        </div>
        {bounds && (
          <MapFrame
            map={d.map}
            bounds={bounds}
            attribution={d.attribution}
            className="pmap__map"
            label={d.title ?? ''}
          >
            {(at) => (
              <>
                {d.landmarks.map((l) => {
                  const [x, y] = at(l.lat, l.lon)
                  return (
                    <g key={l.key}>
                      <circle cx={x} cy={y} r={6} fill="rgba(255,255,255,.9)" />
                      <text className="lbl lbl--soft" x={x + 12} y={y + 5}>
                        {l.name}
                      </text>
                    </g>
                  )
                })}
                {pins.map((p, i) => {
                  const [x, y] = at(p.lat, p.lon)
                  const title = p.project?.title ?? ''
                  const w = title.length * 8.6 + 28
                  return (
                    <g
                      key={i}
                      className={i === cur ? 'pin on' : 'pin'}
                      style={{ transitionDelay: `${0.4 + i * 0.25}s` } as CSSProperties}
                      onClick={() => setCur(i)}
                    >
                      <circle className="pin__halo" cx={x} cy={y} r={14} />
                      <path
                        className="pin__dot"
                        d={`M${x} ${y}c-9-12-14-19-14-26a14 14 0 1 1 28 0c0 7-5 14-14 26z`}
                      />
                      <circle cx={x} cy={y - 26} r={5} fill="var(--ink)" />
                      <g className="pin__tag">
                        <rect x={x + 20} y={y - 50} width={w} height={30} rx={15} />
                        <text x={x + 34} y={y - 30}>
                          {title}
                        </text>
                      </g>
                    </g>
                  )
                })}
              </>
            )}
          </MapFrame>
        )}
      </div>
    </Sec>
  )
}
