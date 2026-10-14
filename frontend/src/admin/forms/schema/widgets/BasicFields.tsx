import * as Switch from '@radix-ui/react-switch'
import { useId } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { Field } from '../../../ui/Field'
import { controlClass } from '../../../ui/styles'
import { useFieldError } from '../useFieldError'
import type { WidgetProps } from '../registry'

export function StringField({ name, node, required, label, description }: WidgetProps) {
  const { field } = useController({ name })
  const error = useFieldError(name)
  const { schema, nullable } = node
  return (
    <Field label={label} hint={description} error={error} required={required && !nullable}>
      {(control) => (
        <input
          {...control}
          ref={field.ref}
          name={field.name}
          value={(field.value as string | null) ?? ''}
          maxLength={schema.maxLength}
          onBlur={field.onBlur}
          // An emptied optional field is stored as null, not as an empty string.
          onChange={(e) =>
            field.onChange(e.target.value === '' && nullable ? null : e.target.value)
          }
          className={controlClass}
        />
      )}
    </Field>
  )
}

export function NumberField({ name, node, required, label, description }: WidgetProps) {
  const { field } = useController({ name })
  const error = useFieldError(name)
  const { schema, nullable } = node
  const value = field.value as number | null | undefined
  return (
    <Field label={label} hint={description} error={error} required={required && !nullable}>
      {(control) => (
        <input
          {...control}
          ref={field.ref}
          type="number"
          inputMode={schema.type === 'integer' ? 'numeric' : 'decimal'}
          step={schema.type === 'integer' ? 1 : 'any'}
          min={schema.minimum}
          max={schema.maximum}
          value={value ?? ''}
          onBlur={field.onBlur}
          onChange={(e) => {
            const raw = e.target.value
            field.onChange(raw === '' ? (nullable ? null : Number.NaN) : Number(raw))
          }}
          className={cn(controlClass, 'md:max-w-48')}
        />
      )}
    </Field>
  )
}

export function BooleanField({ name, label, description }: WidgetProps) {
  const id = useId()
  const { field } = useController({ name })
  const error = useFieldError(name)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-touch items-center gap-3 md:min-h-9">
        <Switch.Root
          id={id}
          ref={field.ref}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          onBlur={field.onBlur}
          aria-describedby={description ? `${id}-hint` : undefined}
          className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors data-[state=checked]:bg-accent"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-panel shadow transition-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
      </div>
      {description && (
        <p id={`${id}-hint`} className="text-xs text-mute">
          {description}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
