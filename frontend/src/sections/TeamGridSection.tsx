import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Person } from '@/api/types'
import { Head, Plus, Sec } from '@/components/site/kit'
import { reduceMotion } from '@/components/site/hooks'
import { useFlip } from '@/components/site/useFlip'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Founder (a large portrait), key people (cards with a bio dialog) or the team with a filter. */
export function TeamGridSection({ section }: SectionProps<'team_grid'>) {
  const d = section.data
  const first = d.people[0]
  if (!first) return null
  if (d.mode === 'founder') return <Founder section={section} person={first} />
  if (d.mode === 'key') return <KeyPeople section={section} />
  return <Crew section={section} />
}

function Founder({ section, person }: SectionProps<'team_grid'> & { person: Person }) {
  const d = section.data
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap founder">
        <div className="founder__ph">
          <SmartImage media={person.photo} fill sizes="(max-width: 860px) 100vw, 40vw" />
        </div>
        <div>
          <span className="eyebrow">{d.eyebrow}</span>
          <h2 className="h2" style={{ marginTop: 16 }}>
            {person.full_name}
          </h2>
          <p className="muted" style={{ marginTop: 8, fontWeight: 600 }}>
            {person.position}
          </p>
          {(d.intro || person.bio) && (
            <p className="lead" style={{ marginTop: 24 }}>
              {d.intro ?? person.bio}
            </p>
          )}
        </div>
      </div>
    </Sec>
  )
}

function KeyPeople({ section }: SectionProps<'team_grid'>) {
  const { t } = useTranslation()
  const d = section.data
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState<Person | null>(null)

  const show = (p: Person, from: HTMLButtonElement) => {
    opener.current = from
    setOpen(p)
  }
  // open after the dialog has the person's content; it grows from the card that opened it
  useEffect(() => {
    const dlg = dialog.current
    if (!open || !dlg || dlg.open) return
    dlg.showModal()
    const r = opener.current?.getBoundingClientRect()
    const b = dlg.getBoundingClientRect()
    if (r)
      dlg.style.transformOrigin = `${r.left + r.width / 2 - b.left}px ${r.top + r.height / 2 - b.top}px`
  }, [open])
  const close = () => {
    const dlg = dialog.current
    if (!dlg) return
    if (reduceMotion()) return dlg.close()
    dlg.classList.add('closing')
    dlg.addEventListener(
      'animationend',
      () => {
        dlg.classList.remove('closing')
        dlg.close()
      },
      { once: true },
    )
  }

  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} lead={d.intro} />
        <div className="people">
          {d.people.map((p) => (
            <button
              key={p.id}
              className="person rv"
              onClick={(e) => show(p, e.currentTarget)}
              aria-haspopup="dialog"
            >
              <span className="person__ph" style={{ display: 'block' }}>
                <SmartImage media={p.photo} fill sizes="(max-width: 560px) 100vw, 33vw" />
                <span className="person__more" aria-hidden="true">
                  <Plus />
                </span>
              </span>
              <span className="h3" style={{ display: 'block', margin: '18px 0 2px' }}>
                {p.full_name}
              </span>
              <span className="muted" style={{ display: 'block', fontSize: 15 }}>
                {p.position}
              </span>
              {p.division && <span className="divtag">{p.division.name}</span>}
              <span className="sr-only">{t('team.bio')}</span>
            </button>
          ))}
        </div>
      </div>
      <dialog
        ref={dialog}
        className="bio"
        aria-labelledby={`bio-${section.id}`}
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        onClick={(e) => e.target === dialog.current && close()}
        onClose={() => {
          setOpen(null)
          opener.current?.focus()
        }}
      >
        {open && (
          <div className="bio__in">
            <SmartImage media={open.photo} fill sizes="(max-width: 700px) 100vw, 360px" />
            <div className="bio__txt">
              {open.division && (
                <span className="eyebrow" style={{ color: 'var(--on-light-2)' }}>
                  {open.division.name}
                </span>
              )}
              <h3
                className="h2"
                id={`bio-${section.id}`}
                style={{ fontSize: 'clamp(28px,3vw,40px)' }}
              >
                {open.full_name}
              </h3>
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{open.position}</p>
              <p>{open.bio}</p>
              {open.linkedin_url && (
                <a
                  href={open.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ink"
                  style={{ alignSelf: 'flex-start' }}
                >
                  {t('team.linkedin')}
                </a>
              )}
            </div>
          </div>
        )}
        <button className="bio__close" aria-label={t('common.close')} onClick={close}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </dialog>
    </Sec>
  )
}

function Crew({ section }: SectionProps<'team_grid'>) {
  const { t } = useTranslation()
  const d = section.data
  const [div, setDiv] = useState<string>('all')
  const flip = useFlip<HTMLDivElement>()
  // the holding's own people (no division) get their own filter too
  const NONE = '-'
  const divisions = [
    ...new Map(
      d.people.map((p) => [p.division?.slug ?? NONE, p.division?.name ?? t('ui.holding')]),
    ).entries(),
  ]
  const shown = d.people.filter((p) => div === 'all' || (p.division?.slug ?? NONE) === div)
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head
          eyebrow={d.eyebrow}
          title={d.title}
          lead={d.intro}
          aside={
            d.show_division_filter && divisions.length > 1 ? (
              <div className="pills" role="group" aria-label={t('team.allDivisions')}>
                <button
                  className="pill"
                  aria-pressed={div === 'all'}
                  onClick={() => flip(() => setDiv('all'))}
                >
                  {t('common.all')}
                </button>
                {divisions.map(([slug, name]) => (
                  <button
                    key={slug}
                    className="pill"
                    aria-pressed={div === slug}
                    onClick={() => flip(() => setDiv(slug))}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        />
        <div className="crew" ref={flip.ref}>
          {shown.map((p) => (
            <div key={p.id} className="mate" data-flip={p.id}>
              <SmartImage media={p.photo} fill sizes="(max-width: 560px) 50vw, 20vw" />
              <h3>{p.full_name}</h3>
              <p>{p.position}</p>
            </div>
          ))}
        </div>
      </div>
    </Sec>
  )
}
