import { type CSSProperties, type KeyboardEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { isNotFound, useProject } from '@/api/queries'
import type { Media, Project } from '@/api/types'
import { Seo } from '@/components/Seo'
import { Arrow, ArrowLeft, Lines, Sec } from '@/components/site/kit'
import { reduceMotion, useReady } from '@/components/site/hooks'
import { STATUS_COLOR } from '@/components/site/projectMeta'
import { Markdown } from '@/components/ui/Markdown'
import { SiteLink } from '@/components/ui/SiteLink'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { pagePath, useLocale } from '@/lib/locale'
import { ErrorState, NotFoundPage, PageSkeleton } from './states'

/** A project: title and gallery on the dark top, the facts and the description below. */
export function ProjectPage() {
  const { slug = '' } = useParams()
  const locale = useLocale()
  const { data: p, error, isPending, refetch } = useProject(slug, locale)
  if (isPending) return <PageSkeleton />
  if (error)
    return isNotFound(error) ? <NotFoundPage /> : <ErrorState onRetry={() => void refetch()} />
  return (
    <>
      <Seo title={`${p.title} · MegaSmart`} description={p.short_description} image={p.cover} />
      <article key={p.id}>
        <Top project={p} />
        <Facts project={p} />
      </article>
    </>
  )
}

function Top({ project: p }: { project: Project }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const ready = useReady()
  const photos = p.gallery.length ? p.gallery : p.cover ? [p.cover] : []
  return (
    <section className={cn('ph tone-dark', ready && 'ready')} aria-labelledby="project-title">
      <div className="wrap">
        <nav className="crumbs fade-up" aria-label={t('ui.breadcrumbs')}>
          <SiteLink to={pagePath(locale, 'projects')}>{t('projectPage.register')}</SiteLink> /{' '}
          {p.title}
        </nav>
        <div className="ph__top">
          <div>
            <h1 className="h1" id="project-title">
              <Lines text={p.title} />
            </h1>
            <p className="lead fade-up">{p.short_description}</p>
          </div>
          <div className="chips fade-up">
            <span className="chip" style={{ '--c': STATUS_COLOR[p.status] } as CSSProperties}>
              <i />
              {t(`status.${p.status}`)}
            </span>
            {p.is_tokenized && (
              <span className="chip chip--dark">
                <i />
                {t('ui.tokenized')}
              </span>
            )}
          </div>
        </div>
        {photos.length > 0 && <Gallery photos={photos} />}
      </div>
    </section>
  )
}

/** Photos change with a wipe from the side the visitor moves to; swipe, arrows and thumbnails. */
function Gallery({ photos }: { photos: Media[] }) {
  const { t } = useTranslation()
  const [cur, setCur] = useState(0)
  const [was, setWas] = useState<number | null>(null)
  const [dir, setDir] = useState(1)
  const start = useRef<{ x: number; t: number } | null>(null)
  const n = photos.length
  const go = (k: number, d?: number) => {
    const next = (k + n) % n
    if (next === cur) return
    setDir(d ?? (next > cur ? 1 : -1))
    setWas(cur)
    setCur(next)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(cur - 1, -1)
    if (e.key === 'ArrowRight') go(cur + 1, 1)
  }
  return (
    <div
      className="gal fade-up"
      role="region"
      aria-roledescription={t('gallery.strip')}
      aria-label={t('project.gallery')}
    >
      <div
        className="gal__stage"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest('button'))
            start.current = { x: e.clientX, t: performance.now() }
        }}
        onPointerUp={(e) => {
          const s = start.current
          start.current = null
          if (!s) return
          const dx = e.clientX - s.x
          const v = Math.abs(dx) / (performance.now() - s.t)
          // a long drag or a quick flick
          if (Math.abs(dx) > 60 || (Math.abs(dx) > 20 && v > 0.5))
            go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1)
        }}
      >
        {photos.map((m, i) => (
          <div
            key={m.id}
            className={cn(
              'slide',
              i === cur && 'on',
              i === was && 'was',
              i === cur && dir < 0 && 'from-left',
            )}
            aria-hidden={i !== cur}
            style={reduceMotion() ? { transition: 'none' } : undefined}
          >
            <SmartImage
              media={m}
              fill
              priority={i === 0}
              sizes="(max-width: 1440px) 100vw, 1312px"
            />
          </div>
        ))}
        {n > 1 && (
          <div className="gal__ui">
            <span className="gal__n" aria-live="polite">
              {cur + 1} / {n}
            </span>
            <div className="ctas" style={{ marginTop: 0 }}>
              <button className="circ" aria-label={t('a11y.prev')} onClick={() => go(cur - 1, -1)}>
                <ArrowLeft />
              </button>
              <button className="circ" aria-label={t('a11y.next')} onClick={() => go(cur + 1, 1)}>
                <Arrow />
              </button>
            </div>
          </div>
        )}
      </div>
      {n > 1 && (
        <div className="gal__thumbs">
          {photos.map((m, i) => (
            <button
              key={m.id}
              className="thumb"
              aria-current={i === cur}
              aria-label={`${i + 1} / ${n}`}
              onClick={() => go(i)}
            >
              <SmartImage media={m} fill sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Facts({ project: p }: { project: Project }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const rows: [string, string][] = [
    [t('project.status'), t(`status.${p.status}`)],
    [t('project.location'), p.location],
    ...(p.division ? ([[t('project.division'), p.division.name]] as [string, string][]) : []),
    [
      t('project.area'),
      p.area_m2 ? `${formatNumber(p.area_m2, locale)} ${t('project.sqm')}` : t('ui.tbd'),
    ],
    [t('project.year'), p.year ? String(p.year) : t('ui.tbd')],
  ]
  return (
    <Sec tone="light" className="alt">
      <div className="wrap">
        <dl className="spec__row rv" style={{ '--n': rows.length } as CSSProperties}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="spec__body">
          <div className="rv">
            <span className="eyebrow">{t('projectPage.about')}</span>
            <h2 className="h2">{p.title}</h2>
            <Markdown className="prose" demoteHeadings>
              {p.body || p.short_description}
            </Markdown>
          </div>
          <div className="rv" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            {p.is_tokenized && (
              <div className="tokbox">
                <span className="eyebrow">{t('projectPage.tokenization')}</span>
                <p>{t('ui.tokenizedNote')}</p>
                <SiteLink
                  to={`${pagePath(locale, 'projects')}#tokenization`}
                  className="btn btn--accent"
                >
                  {t('ui.howItWorks')}
                  <Arrow />
                </SiteLink>
              </div>
            )}
            <div className="nbr">
              {p.prev && (
                <SiteLink
                  to={pagePath(locale, `projects/${p.prev.slug}`)}
                  className="btn btn--white"
                  aria-label={`${t('projectPage.prev')}: ${p.prev.title}`}
                >
                  <ArrowLeft />
                  {p.prev.title}
                </SiteLink>
              )}
              {p.next && (
                <SiteLink
                  to={pagePath(locale, `projects/${p.next.slug}`)}
                  className="btn btn--ink"
                  aria-label={`${t('projectPage.next')}: ${p.next.title}`}
                >
                  {p.next.title}
                  <Arrow />
                </SiteLink>
              )}
            </div>
            <SiteLink
              to={`${pagePath(locale, 'projects')}#list`}
              className="btn btn--accent"
              style={{ justifySelf: 'start' }}
            >
              {t('project.backToProjects')}
            </SiteLink>
          </div>
        </div>
      </div>
    </Sec>
  )
}
