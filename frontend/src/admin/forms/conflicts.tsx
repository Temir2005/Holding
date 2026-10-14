import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Usage } from '../api/media'
import { useT } from '../i18n'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/toast-context'
import { usageHref } from './usage'

/** A list of places that use an object; places that can be opened are links. */
export function UsageList({ usages, onNavigate }: { usages: Usage[]; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {usages.map((usage, i) => {
        const href = usageHref(usage)
        return (
          <li
            key={`${usage.entity_type}-${usage.entity_id}-${usage.field}-${i}`}
            className="text-sm"
          >
            {href ? (
              <Link
                to={href}
                onClick={onNavigate}
                className="inline-flex min-h-touch items-center gap-1.5 text-accent-ink underline underline-offset-4 md:min-h-8"
              >
                {usage.label}
                <ExternalLink size={14} aria-hidden="true" />
              </Link>
            ) : (
              <span className="inline-flex min-h-touch items-center md:min-h-8">{usage.label}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** 409 IN_USE: the object cannot be deleted while these places reference it. */
export function InUseDialog({ usages, onClose }: { usages: Usage[] | null; onClose: () => void }) {
  const t = useT()
  return (
    <Dialog
      open={usages !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t('conflict.inUseTitle')}
      description={t('conflict.inUseText')}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('conflict.close')}
        </Button>
      }
    >
      <UsageList usages={usages ?? []} onNavigate={onClose} />
    </Dialog>
  )
}

/**
 * 409 VERSION_CONFLICT: someone saved the record after it was opened. Nothing is
 * overwritten: either load the fresh version (own edits are lost) or keep editing and copy
 * own edits to the clipboard to re-apply them after reloading.
 */
export function VersionConflictDialog({
  open,
  edits,
  onReload,
  onKeep,
}: {
  open: boolean
  /** The user's unsaved values, copied to the clipboard on "keep". */
  edits: unknown
  onReload: () => void
  onKeep: () => void
}) {
  const t = useT()
  const toast = useToast()

  const keep = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(edits, null, 2))
      toast.success(t('conflict.copied'))
    } catch {
      toast.show({ tone: 'info', title: t('conflict.copyFailed') })
    }
    onKeep()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onKeep()}
      title={t('conflict.title')}
      description={t('conflict.text')}
      modalOnly
      footer={
        <>
          <Button onClick={() => void keep()}>{t('conflict.keep')}</Button>
          <Button variant="primary" onClick={onReload}>
            {t('conflict.reload')}
          </Button>
        </>
      }
    />
  )
}
