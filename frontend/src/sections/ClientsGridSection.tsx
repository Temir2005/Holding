import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Head, Sec } from '@/components/site/kit'
import { useFlip } from '@/components/site/useFlip'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Logo wall with an industry filter (counts in the pills); logos are grey, in colour on hover. */
export function ClientsGridSection({ section }: SectionProps<'clients_grid'>) {
  const { t } = useTranslation()
  const d = section.data
  const [ind, setInd] = useState('all')
  const flip = useFlip<HTMLUListElement>()
  const industries = [...new Map(d.clients.map((c) => [c.industry, c.industry_label])).entries()]
  const shown = d.clients.filter((c) => ind === 'all' || c.industry === ind)
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
        {d.show_industry_filter && industries.length > 1 && (
          <div
            className="pills"
            role="group"
            aria-label={t('clientsGrid.filter')}
            style={{ marginTop: -16, marginBottom: 40 }}
          >
            <button
              className="pill"
              aria-pressed={ind === 'all'}
              onClick={() => flip(() => setInd('all'))}
            >
              {t('common.all')} <sup>{d.clients.length}</sup>
            </button>
            {industries.map(([key, label]) => (
              <button
                key={key}
                className="pill"
                aria-pressed={ind === key}
                onClick={() => flip(() => setInd(key))}
              >
                {label} <sup>{d.clients.filter((c) => c.industry === key).length}</sup>
              </button>
            ))}
          </div>
        )}
        {d.clients.length ? (
          <ul className="logos" ref={flip.ref}>
            {shown.map((c) => (
              <li key={c.id} className="logo-cell" data-flip={c.id}>
                {c.logo && <SmartImage media={c.logo} fill fit="contain" sizes="34px" />}
                <span>{c.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{t('clientsGrid.empty')}</p>
        )}
        <p className="count" aria-live="polite">
          {t('ui.shownClients', { count: shown.length })}
        </p>
      </div>
    </Sec>
  )
}
