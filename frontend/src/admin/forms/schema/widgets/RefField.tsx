import { Link2 } from 'lucide-react'
import { useController } from 'react-hook-form'
import { useT } from '../../../i18n'
import { useFieldError } from '../useFieldError'
import { MediaRefField } from './MediaRefField'
import type { WidgetProps } from '../registry'

/**
 * `x-ref` (media, projects, people…). Until the pickers arrive (media library, lookup),
 * the field shows what is selected and keeps the value exactly as it came.
 */
export function RefField(props: WidgetProps) {
  // Media has its picker; other kinds get theirs with the page editor (lookup).
  if (props.node.schema['x-ref']?.kind === 'media') return <MediaRefField {...props} />
  return <PendingRefField {...props} />
}

function PendingRefField({ name, label, description }: WidgetProps) {
  const t = useT()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const value: unknown = field.value
  const count = Array.isArray(value) ? value.length : value ? 1 : 0

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2 rounded border border-dashed border-line-strong px-3 py-2 text-sm">
        <Link2 size={16} aria-hidden="true" className="shrink-0 text-mute" />
        <span>{count > 0 ? t('form.ref.count', { count }) : t('form.ref.none')}</span>
      </div>
      <p className="text-xs text-mute">
        {t('form.ref.pending')}
        {description ? `. ${description}` : ''}
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
