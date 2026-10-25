import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Arrow, Head, Plus, Sec } from '@/components/site/kit'
import type { SectionProps } from './types'

/** Open vacancies: rows that open in place; "apply" scrolls to the form and fills it in. */
export function VacanciesSection({ section }: SectionProps<'vacancies'>) {
  const { t } = useTranslation()
  const d = section.data
  const [open, setOpen] = useState<string | null>(null)
  const apply = (title: string) => {
    window.dispatchEvent(new CustomEvent('lead:apply', { detail: title }))
  }
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} />
        {d.vacancies.length > 0 && (
          <ul className="vac__list">
            {d.vacancies.map((v) => {
              const on = open === v.id
              return (
                <li key={v.id} className="vac__row">
                  <button
                    className="vac__btn"
                    aria-expanded={on}
                    aria-controls={`vac-${v.id}`}
                    onClick={() => setOpen(on ? null : v.id)}
                  >
                    <h3>{v.title}</h3>
                    {v.division ? <span>{v.division.name}</span> : <span />}
                    <span>
                      {v.location} · {t(`vacancy.${v.employment_type}`)}
                    </span>
                    <span className="vac__ic" aria-hidden="true">
                      <Plus />
                    </span>
                  </button>
                  <div className="vac__body" id={`vac-${v.id}`} {...(on ? {} : { inert: '' })}>
                    <div>
                      <p>{v.description}</p>
                      <a href="#contacts" className="btn btn--ink" onClick={() => apply(v.title)}>
                        {t('vacancy.apply')}
                        <Arrow />
                      </a>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {(d.empty_text || !d.vacancies.length) && (
          <p className="empty" style={{ marginTop: 24 }}>
            {d.empty_text ?? t('vacancy.empty')}
          </p>
        )}
      </div>
    </Sec>
  )
}
