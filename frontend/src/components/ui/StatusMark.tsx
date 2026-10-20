import { useTranslation } from 'react-i18next'
import type { ProjectStatus } from '@/api/types'
import { cn } from '@/lib/cn'

/**
 * Project status as a drawing legend: an empty, half or full square plus the label.
 * The shape carries the meaning, so it never relies on colour alone.
 */
export function StatusMark({ status, className }: { status: ProjectStatus; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-caption font-medium uppercase text-fg',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-2 w-2 flex-none border border-current',
          status === 'completed' && 'bg-current',
          status === 'in_progress' &&
            'bg-[linear-gradient(135deg,currentColor_50%,transparent_50%)]',
        )}
      />
      {t(`status.${status}`)}
    </span>
  )
}
