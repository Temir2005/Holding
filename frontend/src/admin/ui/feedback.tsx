import { AlertCircle, CheckCircle2, Info, RotateCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useT } from '../i18n'
import { Button } from './Button'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const BADGE: Record<Tone, string> = {
  neutral: 'bg-sunken text-mute',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium',
        BADGE[tone],
      )}
    >
      {children}
    </span>
  )
}

const ALERT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
}

export function Alert({
  tone = 'danger',
  title,
  children,
  action,
}: {
  tone?: Exclude<Tone, 'neutral'>
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  const Icon = ALERT_ICON[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded p-3 text-sm', BADGE[tone])}
    >
      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-fg">
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded bg-sunken motion-reduce:animate-none', className)}
    />
  )
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode
  title: ReactNode
  text?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      {icon && <div className="text-mute">{icon}</div>}
      <h2 className="text-base">{title}</h2>
      {text && <p className="max-w-md text-sm text-mute">{text}</p>}
      {action}
    </div>
  )
}

/**
 * A list or a block that failed to load: says so (instead of looking empty) and offers a
 * retry. `compact` fits inside a card.
 */
export function ErrorState({
  onRetry,
  compact = false,
}: {
  onRetry: () => void
  compact?: boolean
}) {
  const t = useT()
  const retry = (
    <Button size="sm" icon={<RotateCw size={14} aria-hidden="true" />} onClick={onRetry}>
      {t('common.retry')}
    </Button>
  )
  if (compact) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
        <AlertCircle size={16} aria-hidden="true" className="text-danger" />
        <span className="flex-1">{t('errors.loadFailed')}</span>
        {retry}
      </div>
    )
  }
  return (
    <div role="alert">
      <EmptyState
        icon={<AlertCircle size={28} aria-hidden="true" className="text-danger" />}
        title={t('errors.loadFailed')}
        text={t('errors.loadFailedText')}
        action={retry}
      />
    </div>
  )
}
