import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Head, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/**
 * One kitchen, several coats: choosing a coat wipes the new fronts over the old ones; on gloss a
 * glare sweeps across. Every photo is the same frame, only the panels differ.
 */
export function FinishesSection({ section }: SectionProps<'finishes'>) {
  const { t } = useTranslation()
  const d = section.data
  const [cur, setCur] = useState(0)
  const [was, setWas] = useState<number | null>(null)
  const [glare, setGlare] = useState(0)
  if (!d.items.length) return null
  const item = d.items[cur]
  const pick = (i: number) => {
    if (i === cur) return
    setWas(cur)
    setCur(i)
    if (d.items[i]?.finish === 'gloss') setGlare((g) => g + 1)
  }
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} />
        <div className="fin__bar">
          <div className="pills" role="group" aria-label={t('ui.finish')}>
            {d.items.map((it, i) => (
              <button
                key={it.label}
                className="pill"
                aria-pressed={i === cur}
                onClick={() => pick(i)}
              >
                {it.label}
              </button>
            ))}
          </div>
          <p className="fin__cap" aria-live="polite">
            <i style={{ background: item?.color }} aria-hidden="true" />
            {item?.caption}
          </p>
        </div>
        <div className="fin__stage">
          {d.items.map((it, i) => (
            <div
              key={it.label}
              className={i === cur ? 'coat on' : i === was ? 'coat was' : 'coat'}
              aria-hidden={i !== cur}
            >
              <SmartImage media={it.media} fill sizes="(max-width: 1440px) 100vw, 1312px" />
            </div>
          ))}
          {glare > 0 && <span key={glare} className="glare go" aria-hidden="true" />}
        </div>
      </div>
    </Sec>
  )
}
