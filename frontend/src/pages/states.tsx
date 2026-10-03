import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { buttonClass } from '@/lib/button'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLocale } from '@/lib/locale'

/** Shape of a typical page while it loads: hero, a band of figures, a grid. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Container className="grid grid-cols-1 gap-10 pb-16 pt-[calc(var(--header-h)+2.5rem)] lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-28 w-full md:h-40" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-12 w-56 rounded-full" />
        </div>
        <Skeleton className="aspect-[4/3] lg:col-span-6" />
      </Container>
      <div className="tone-light py-12">
        <Container className="grid grid-cols-2 gap-6 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </Container>
      </div>
      <Container className="grid grid-cols-1 gap-2 py-16 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </Container>
    </div>
  )
}

function StateLayout({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <Container className="flex min-h-[70svh] flex-col items-start justify-center gap-6 pb-16 pt-[calc(var(--header-h)+3rem)]">
      <h1 className="text-h2">{title}</h1>
      <p className="max-w-prose text-lead text-fg-mute">{text}</p>
      {action}
    </Container>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <StateLayout
      title={t('states.errorTitle')}
      text={t('states.errorText')}
      action={
        <button type="button" onClick={onRetry} className={buttonClass('primary')}>
          {t('states.retry')}
        </button>
      }
    />
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <StateLayout
      title={t('states.notFoundTitle')}
      text={t('states.notFoundText')}
      action={
        <Link to={`/${locale}`} className={buttonClass('primary')}>
          {t('nav.home')}
        </Link>
      }
    />
  )
}
