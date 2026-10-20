import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Frame } from '@/components/ui/Frame'
import { Section } from '@/components/ui/Section'
import { Skeleton } from '@/components/ui/Skeleton'
import { buttonClass } from '@/lib/button'
import { useLocale } from '@/lib/locale'
import { DimArrow } from '@/components/ui/DimArrow'

/**
 * Shape of a typical page while it loads, in the language of the sheet: hatched plates where
 * the hero heading, the datum, the lead and the large shot will be, then a band of figures.
 */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Section tone="dark" space="none" trace={false}>
        <div className="grid min-h-[100svh] content-start gap-8 pb-16 pt-[calc(var(--header-h)+clamp(40px,4.4vw,72px))]">
          <div className="grid gap-3">
            <Skeleton className="h-[clamp(2.5rem,7vw,8rem)] w-[min(100%,52rem)]" />
            <Skeleton className="h-[clamp(2.5rem,7vw,8rem)] w-[min(78%,38rem)]" />
          </div>
          <span aria-hidden="true" className="block h-px bg-line-strong" />
          <div className="grid grid-cols-12 gap-x-gap gap-y-8">
            <div className="col-span-12 grid content-start gap-3 md:col-span-7 min-[1081px]:col-span-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-5 h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="col-span-12 aspect-[3/2] md:aspect-[16/9] min-[1081px]:col-span-9 min-[1081px]:aspect-auto min-[1081px]:min-h-[clamp(320px,46svh,640px)]" />
          </div>
        </div>
      </Section>
    </div>
  )
}

type StateProps = {
  /** Short code of the state on the sheet: 404, «—» for errors. */
  code: string
  title: string
  text: string
  action?: ReactNode
}

/**
 * A page state as an empty sheet of the set: the code drawn large and thin like a stage number,
 * an empty frame with crop marks where the drawing should be, the message and one action.
 */
function StateSheet({ code, title, text, action }: StateProps) {
  return (
    <Section tone="dark" space="none">
      <div className="grid min-h-[80svh] content-center gap-12 lg:min-h-[100svh] pb-section-y-end pt-[calc(var(--header-h)+3rem)] lg:grid-cols-12 lg:gap-x-gap">
        <div className="grid content-start gap-6 lg:col-span-6">
          <p
            aria-hidden="true"
            className="text-stat-hero font-extralight leading-[0.82] tracking-[-0.06em] text-fg-mute"
          >
            {code}
          </p>
          <h1 className="text-title font-heading">{title}</h1>
          <p className="max-w-[44ch] text-lead text-fg-mute">{text}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
        <div className="hidden lg:col-span-5 lg:col-start-8 lg:block">
          <Frame>
            <div aria-hidden="true" className="plate aspect-[4/5] w-full" />
          </Frame>
          <DimensionLine label={code} className="mt-6" />
        </div>
      </div>
    </Section>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <StateSheet
      code="—"
      title={t('states.errorTitle')}
      text={t('states.errorText')}
      action={
        <button type="button" onClick={onRetry} className={buttonClass('primary')}>
          <span>{t('states.retry')}</span>
          <DimArrow />
        </button>
      }
    />
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <StateSheet
      code="404"
      title={t('states.notFoundTitle')}
      text={t('states.notFoundText')}
      action={
        <Link to={`/${locale}`} className={buttonClass('primary')}>
          <span>{t('nav.home')}</span>
          <DimArrow />
        </Link>
      }
    />
  )
}

/** Preview link expired: same sheet, no action (a new link comes from the admin). */
export function PreviewExpired() {
  const { t } = useTranslation()
  return <StateSheet code="—" title={t('preview.expiredTitle')} text={t('preview.expiredText')} />
}
