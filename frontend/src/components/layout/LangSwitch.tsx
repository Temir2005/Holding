import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { SiteLink } from '@/components/ui/SiteLink'
import { cn } from '@/lib/cn'
import { LOCALE_LABELS, LOCALES, swapLocale, useLocale } from '@/lib/locale'

export function LangSwitch({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { pathname, hash } = useLocation()
  return (
    <nav aria-label={t('nav.language')} className={cn('lang', className)}>
      {LOCALES.map((l) => (
        <SiteLink
          key={l}
          to={swapLocale(pathname, l) + hash}
          hrefLang={l}
          lang={l}
          onClick={onNavigate}
          aria-current={l === locale ? 'true' : undefined}
        >
          {LOCALE_LABELS[l]}
        </SiteLink>
      ))}
    </nav>
  )
}
