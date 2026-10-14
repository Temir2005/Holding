import { AlertCircle, CheckCircle2, RotateCw, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { IconButton } from '../../ui/IconButton'
import { formatBytes } from './format'
import type { UploadItem } from './useUploads'

function statusText(t: ReturnType<typeof useT>, item: UploadItem) {
  switch (item.status) {
    case 'preparing':
      return t('media.uploads.preparing')
    case 'uploading':
      return t('media.uploads.uploading', { percent: Math.round(item.progress * 100) })
    case 'processing':
      return t('media.uploads.processing')
    case 'done':
      return t('media.uploads.done')
    case 'error':
      return item.error ?? t('media.uploads.failed')
  }
}

/** Current uploads with progress; errors and server warnings stay until dismissed. */
export function UploadPanel({
  items,
  onRetry,
  onDismiss,
  onClearDone,
}: {
  items: UploadItem[]
  onRetry: (id: string) => void
  onDismiss: (id: string) => void
  onClearDone: () => void
}) {
  const t = useT()
  if (items.length === 0) return null
  const anyDone = items.some((i) => i.status === 'done' && i.warnings.length === 0)
  return (
    <section
      aria-label={t('media.uploads.title')}
      className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm">{t('media.uploads.title')}</h2>
        {anyDone && (
          <Button size="sm" variant="ghost" onClick={onClearDone}>
            {t('media.uploads.clear')}
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-2" aria-live="polite">
        {items.map((item) => {
          const busy =
            item.status === 'preparing' ||
            item.status === 'uploading' ||
            item.status === 'processing'
          const Icon =
            item.status === 'error'
              ? AlertCircle
              : item.warnings.length
                ? TriangleAlert
                : CheckCircle2
          return (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                {!busy && (
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className={cn(
                      'shrink-0',
                      item.status === 'error'
                        ? 'text-danger'
                        : item.warnings.length
                          ? 'text-warning'
                          : 'text-success',
                    )}
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                <span className="shrink-0 font-mono text-xs text-mute">
                  {formatBytes(item.file.size)}
                </span>
                {item.status === 'error' && (
                  <IconButton
                    label={t('media.uploads.retry')}
                    icon={<RotateCw size={16} aria-hidden="true" />}
                    onClick={() => onRetry(item.id)}
                  />
                )}
                {!busy && (
                  <IconButton
                    label={t('media.uploads.dismiss')}
                    icon={<X size={16} aria-hidden="true" />}
                    onClick={() => onDismiss(item.id)}
                  />
                )}
              </div>
              {busy && (
                <div
                  role="progressbar"
                  aria-label={item.file.name}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(item.progress * 100)}
                  className="h-1.5 overflow-hidden rounded-full bg-sunken"
                >
                  <div
                    className={cn(
                      'h-full rounded-full bg-accent transition-[width]',
                      item.status === 'processing' && 'animate-pulse motion-reduce:animate-none',
                    )}
                    style={{ width: `${Math.max(4, item.progress * 100)}%` }}
                  />
                </div>
              )}
              <p className={cn('text-xs', item.status === 'error' ? 'text-danger' : 'text-mute')}>
                {statusText(t, item)}
              </p>
              {item.warnings.map((warning) => (
                <p key={warning} className="rounded bg-warning-soft px-2 py-1 text-xs text-fg">
                  {warning}
                </p>
              ))}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
