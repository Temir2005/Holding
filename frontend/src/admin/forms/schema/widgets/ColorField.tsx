import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { useT } from '../../../i18n'
import { Field } from '../../../ui/Field'
import { controlClass } from '../../../ui/styles'
import { useFieldError } from '../useFieldError'
import type { WidgetProps } from '../registry'

const HEX = /^#[0-9a-f]{6}$/i

/** `x-widget: color`: the system color picker plus the `#rrggbb` code. */
export function ColorField({ name, node, required, label, description }: WidgetProps) {
  const t = useT()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const value = (field.value as string | null) ?? ''
  const valid = HEX.test(value)

  return (
    <Field label={label} hint={description} error={error} required={required && !node.nullable}>
      {(control) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${label}: ${t('form.color.picker')}`}
            value={valid ? value.toLowerCase() : '#000000'}
            onChange={(e) => field.onChange(e.target.value)}
            className="h-11 w-14 shrink-0 cursor-pointer rounded border border-line-strong bg-panel p-1 md:h-9"
          />
          <input
            {...control}
            ref={field.ref}
            aria-label={`${label}: ${t('form.color.hex')}`}
            spellCheck={false}
            maxLength={7}
            placeholder="#RRGGBB"
            value={value}
            onBlur={field.onBlur}
            onChange={(e) => {
              const raw = e.target.value.trim()
              field.onChange(raw && !raw.startsWith('#') ? `#${raw}` : raw)
            }}
            className={cn(controlClass, 'font-mono uppercase md:max-w-36')}
          />
        </div>
      )}
    </Field>
  )
}
