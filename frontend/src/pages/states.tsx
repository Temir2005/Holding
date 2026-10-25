import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Arrow } from '@/components/site/kit'
import { SiteLink } from '@/components/ui/SiteLink'
import { useLocale } from '@/lib/locale'

/** Shape of a page while it loads: a dark first screen with a heading, a line and buttons. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="tone-dark state">
      <div className="wrap" style={{ width: '100%', display: 'grid', gap: 16 }}>
        <div className="skel" style={{ height: 14, width: 220 }} />
        <div
          className="skel"
          style={{ height: 'clamp(40px,5vw,80px)', width: 'min(100%, 720px)' }}
        />
        <div
          className="skel"
          style={{ height: 'clamp(40px,5vw,80px)', width: 'min(80%, 520px)' }}
        />
        <div className="skel" style={{ height: 18, width: 'min(100%, 560px)', marginTop: 12 }} />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <div className="skel" style={{ height: 52, width: 180, borderRadius: 999 }} />
          <div className="skel" style={{ height: 52, width: 160, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  )
}

function StateScreen({
  code,
  title,
  text,
  action,
}: {
  code: string
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <section className="tone-dark state">
      <div className="wrap">
        <p className="state__code" aria-hidden="true">
          {code}
        </p>
        <h1 className="h2">{title}</h1>
        <p className="lead">{text}</p>
        {action && <div className="ctas">{action}</div>}
      </div>
    </section>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <StateScreen
      code="—"
      title={t('states.errorTitle')}
      text={t('states.errorText')}
      action={
        <button type="button" onClick={onRetry} className="btn btn--accent">
          {t('states.retry')}
          <Arrow />
        </button>
      }
    />
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <StateScreen
      code="404"
      title={t('states.notFoundTitle')}
      text={t('states.notFoundText')}
      action={
        <SiteLink to={`/${locale}`} className="btn btn--accent">
          {t('nav.home')}
          <Arrow />
        </SiteLink>
      }
    />
  )
}

export function PreviewExpired() {
  const { t } = useTranslation()
  return <StateScreen code="—" title={t('preview.expiredTitle')} text={t('preview.expiredText')} />
}
