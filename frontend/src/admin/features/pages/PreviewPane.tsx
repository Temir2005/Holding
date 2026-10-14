import { useQuery } from '@tanstack/react-query'
import { ExternalLink, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import {
  previewTokenQuery,
  previewUrl,
  SITE_LOCALES as LOCALES,
  type PageDetail,
  type SiteLocale,
} from '../../api/pages'
import { useT } from '../../i18n'
import { IconButton } from '../../ui/IconButton'
import { Alert, Skeleton } from '../../ui/feedback'
import { Tooltip } from '../../ui/Tooltip'

/**
 * The draft as the site renders it (the site's preview route in a frame). It reloads when
 * the draft changes (`draft_hash`), so a save shows up without extra clicks.
 */
export function PreviewPane({ page, className }: { page: PageDetail; className?: string }) {
  const t = useT()
  const [locale, setLocale] = useState<SiteLocale>('ru')
  const [reloads, setReloads] = useState(0)
  const token = useQuery(previewTokenQuery(page.id))
  const src = token.data ? previewUrl(page.slug, token.data.token, locale) : null

  return (
    <section
      aria-label={t('preview.title')}
      className={cn('flex min-h-0 flex-col rounded-lg border border-line bg-panel', className)}
    >
      <div className="flex items-center gap-2 border-b border-line px-2 py-1">
        <h2 className="flex-1 px-1 text-sm">{t('preview.title')}</h2>
        <div role="group" aria-label={t('preview.locale')} className="flex">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === locale}
              onClick={() => setLocale(l)}
              className={cn(
                'min-h-touch min-w-touch rounded px-2 font-mono text-xs md:min-h-8 md:min-w-8',
                l === locale ? 'bg-fg text-canvas' : 'text-mute hover:text-fg',
              )}
            >
              {t(`locales.short.${l}`)}
            </button>
          ))}
        </div>
        <IconButton
          label={t('preview.reload')}
          icon={<RotateCw size={16} aria-hidden="true" />}
          onClick={() => {
            void token.refetch()
            setReloads((n) => n + 1)
          }}
        />
        {src && (
          <Tooltip label={t('preview.openTab')}>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              aria-label={t('preview.openTab')}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded text-mute hover:bg-sunken hover:text-fg md:min-h-9 md:min-w-9"
            >
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </Tooltip>
        )}
      </div>
      {token.isError ? (
        <div className="p-3">
          <Alert tone="danger">{t('preview.failed')}</Alert>
        </div>
      ) : !src ? (
        <Skeleton className="m-3 flex-1" />
      ) : (
        <iframe
          key={`${page.draft_hash}-${locale}-${reloads}`}
          src={src}
          title={t('preview.frame', { name: page.slug })}
          className="min-h-0 w-full flex-1 rounded-b-lg bg-white"
        />
      )}
    </section>
  )
}
