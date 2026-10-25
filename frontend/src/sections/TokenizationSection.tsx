import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Head, Sec } from '@/components/site/kit'
import { reduceMotion, useInView } from '@/components/site/hooks'
import { SmartImage } from '@/components/ui/SmartImage'
import { SiteLink } from '@/components/ui/SiteLink'
import { pagePath, useLocale } from '@/lib/locale'
import type { SectionProps } from './types'

const COLS = 6
const ROWS = 7
const TW = 44
const TH = 40
const X0 = 60
const Y0 = 372 - ROWS * TH
// the shares that go to the investor's card
const PICKS = [3, 10, 16, 23, 29, 38]
const DUR = 3600

/**
 * How tokenization works, drawn: a building (object), split into shares, a few shares move to
 * the investor's card, the floors report progress. Steps play by themselves while in view;
 * a click picks a step and stops the play. The legal disclaimer comes from the CMS.
 */
export function TokenizationSection({ section }: SectionProps<'tokenization_explainer'>) {
  const { t } = useTranslation()
  const locale = useLocale()
  const d = section.data
  const n = d.steps.length
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ref, seen] = useInView<HTMLDivElement>('0px 0px -30% 0px')
  const [run, setRun] = useState(0)
  const timer = useRef(0)

  const playing = seen && !paused && !reduceMotion() && n > 1
  useEffect(() => {
    if (!playing) return
    timer.current = window.setTimeout(() => {
      setStep((s) => (s + 1) % n)
      setRun((r) => r + 1)
    }, DUR)
    return () => window.clearTimeout(timer.current)
  }, [playing, step, n])

  // the drawing has four states; with more or fewer steps they map proportionally
  const art = n > 1 ? Math.round((step / (n - 1)) * 3) : 3

  const tiles = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const k = r * COLS + c
      const x = X0 + c * TW
      const y = Y0 + r * TH
      const pi = PICKS.indexOf(k)
      const style = {
        '--r': ROWS - 1 - r,
        ...(pi > -1
          ? {
              '--tx': `${392 + (pi % 3) * 50 - x}px`,
              '--ty': `${176 + Math.floor(pi / 3) * 50 - y}px`,
            }
          : {}),
      } as CSSProperties
      tiles.push(
        <g key={k} className={pi > -1 ? 'tile pick' : 'tile'} style={style}>
          <rect className="bg" x={x} y={y} width={TW} height={TH} />
          <rect className="win" x={x + 12} y={y + 10} width={20} height={20} rx={2} />
        </g>,
      )
    }

  return (
    <Sec tone={section.tone} anchor={section.anchor} className={playing ? 'play' : undefined}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} className="tok__head" />
        <div className="tok__grid" ref={ref} style={{ '--dur': `${DUR}ms` } as CSSProperties}>
          <ol className="tsteps" aria-label={t('tokenization.steps')}>
            {d.steps.map((s, i) => (
              <li key={i}>
                <button
                  className="tstep"
                  aria-current={i === step ? 'step' : undefined}
                  onClick={() => {
                    setStep(i)
                    setPaused(true)
                  }}
                >
                  <b>{String(i + 1).padStart(2, '0')}</b>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {i === step && <i key={run} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ol>
          <div className="tok__art" aria-hidden="true">
            <svg className="art" data-step={art} viewBox="0 0 600 420">
              <line className="ground" x1="40" y1="372" x2="560" y2="372" />
              <g>{tiles}</g>
              <g className="wallet">
                <rect className="card-bg" x="372" y="96" width="188" height="200" rx="16" />
                <text x="392" y="132">
                  {t('tokenization.share')}
                </text>
                <g className="prog">
                  <text x="392" y="322" style={{ fontSize: 12, fontWeight: 500, opacity: 0.6 }}>
                    {t('tokenization.progress')}
                  </text>
                  <rect
                    x="392"
                    y="334"
                    width="148"
                    height="6"
                    rx="3"
                    fill="rgba(255,255,255,.14)"
                  />
                  <rect className="fill" x="392" y="334" width="148" height="6" rx="3" />
                </g>
              </g>
            </svg>
          </div>
        </div>
        <div className="tok__foot">
          <div>
            <ul className="ben">
              {d.benefits.map((b) => (
                <li key={b}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    aria-hidden="true"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
            {d.projects.length > 0 && (
              <div className="tok__projects" aria-label={t('tokenization.projects')}>
                {d.projects.map((p) => (
                  <SiteLink key={p.id} to={pagePath(locale, `projects/${p.slug}`)}>
                    <SmartImage media={p.cover} fill sizes="32px" />
                    {p.title}
                  </SiteLink>
                ))}
              </div>
            )}
          </div>
          <div className="disc">
            <h3>{t('tokenization.note')}</h3>
            <p>{d.disclaimer}</p>
          </div>
        </div>
      </div>
    </Sec>
  )
}
