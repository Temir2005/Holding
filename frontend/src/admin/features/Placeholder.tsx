import { Construction, SearchX } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useT } from '../i18n'
import { COLLECTIONS } from '../layout/nav'
import { ButtonLink } from '../ui/Button'
import { EmptyState } from '../ui/feedback'

export function PageTitle({ children }: { children: string }) {
  return <h1 className="mb-4 text-xl md:mb-6 md:text-2xl">{children}</h1>
}

/** Stand-in for sections built in later stages; keeps navigation testable now. */
export function SectionPlaceholder({ title }: { title: string }) {
  const t = useT()
  return (
    <>
      <PageTitle>{t(title)}</PageTitle>
      <EmptyState
        icon={<Construction size={28} aria-hidden="true" />}
        title={t('placeholder.title')}
        text={t('placeholder.text')}
      />
    </>
  )
}

export function CollectionPlaceholder() {
  const { collection } = useParams()
  const known = COLLECTIONS.some((c) => c.slug === collection)
  return known ? <SectionPlaceholder title={`collections.${collection}`} /> : <AdminNotFound />
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
