import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { SiteLink } from '@/components/ui/SiteLink'
import { cn } from '@/lib/cn'
import { LOCALE_LABELS, LOCALES, swapLocale, useLocale } from '@/lib/locale'

type Props = {
  className?: string
  /** `inline`: mono codes with the red line under the current one; `boxed`: square segments. */
  variant?: 'inline' | 'boxed'
}

export function LangSwitch({ className, variant = 'inline' }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { pathname, hash } = useLocation()
  return (
    <nav
      aria-label={t('nav.language')}
      className={cn('flex items-center', variant === 'boxed' ? 'gap-0' : 'gap-0.5', className)}
    >
      {LOCALES.map((l) => {
        const current = l === locale
        return (
          <SiteLink
            key={l}
            to={swapLocale(pathname, l) + hash}
            hrefLang={l}
            lang={l}
            aria-current={current ? 'true' : undefined}
            className={cn(
              'flex min-h-11 items-center justify-center font-mono text-caption font-medium uppercase transition-colors duration-1',
              variant === 'inline' && 'min-w-9 px-2',
              variant === 'inline' &&
                (current
                  ? 'text-fg shadow-[inset_0_-1px_0_rgb(var(--trace))]'
                  : 'text-fg-mute hover:text-fg'),
              variant === 'boxed' && '-ml-px min-w-12 border px-3 first:ml-0',
              variant === 'boxed' &&
                (current
                  ? 'relative border-fg text-fg'
                  : 'border-line-strong text-fg-mute hover:text-fg'),
            )}
          >
            {LOCALE_LABELS[l]}
          </SiteLink>
        )
      })}
    </nav>
  )
}
