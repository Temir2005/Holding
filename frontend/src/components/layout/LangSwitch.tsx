import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { LOCALE_LABELS, LOCALES, swapLocale, useLocale } from '@/lib/locale'

export function LangSwitch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { pathname, hash } = useLocation()
  return (
    <nav aria-label={t('nav.language')} className={cn('flex items-center gap-1 font-mono text-xs', className)}>
      {LOCALES.map((l) => (
        <Link
          key={l}
          to={swapLocale(pathname, l) + hash}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? 'true' : undefined}
          className={cn(
            'flex min-h-11 min-w-9 items-center justify-center rounded-full px-2 transition-colors',
            l === locale ? 'text-fg' : 'text-fg-mute hover:text-fg',
          )}
        >
          {LOCALE_LABELS[l]}
        </Link>
      ))}
    </nav>
  )
}
