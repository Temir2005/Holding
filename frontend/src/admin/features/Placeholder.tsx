import { SearchX } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useT } from '../i18n'
import { ButtonLink } from '../ui/Button'
import { EmptyState } from '../ui/feedback'

/** The browser tab says which section is open (and screen readers announce it). */
export function DocumentTitle({ title }: { title: string }) {
  const t = useT()
  return (
    <Helmet>
      <title>{`${title} — ${t('app.title')}`}</title>
    </Helmet>
  )
}

export function PageTitle({ children }: { children: string }) {
  return (
    <>
      <DocumentTitle title={children} />
      <h1 className="mb-4 text-xl md:mb-6 md:text-2xl">{children}</h1>
    </>
  )
}

export function AdminNotFound() {
  const t = useT()
  return (
    <EmptyState
      icon={<SearchX size={28} aria-hidden="true" />}
      title={t('errors.notFoundTitle')}
      text={t('errors.notFoundText')}
      action={
        <ButtonLink to="/admin" variant="secondary">
          {t('placeholder.toDashboard')}
        </ButtonLink>
      }
    />
  )
}
