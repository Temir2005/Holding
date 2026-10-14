import { useState } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { useT } from '../../../i18n'
import { Field } from '../../../ui/Field'
import { controlClass } from '../../../ui/styles'
import { useFieldError } from '../useFieldError'
import type { WidgetProps } from '../registry'

const format = (value: unknown) => (value === undefined ? '' : JSON.stringify(value, null, 2))

/**
 * Fallback for values without an editor (an unknown `x-widget`): raw JSON, applied on blur
 * only when it parses, so a typo never corrupts the stored value.
 */
export function JsonField({ name, node, required, label, description }: WidgetProps) {
  const t = useT()
  const { field } = useController({ name })
  const serverError = useFieldError(name)
  const [text, setText] = useState(() => format(field.value))
  const [invalid, setInvalid] = useState(false)

  const apply = () => {
    field.onBlur()
    if (text.trim() === '') {
      setInvalid(false)
      field.onChange(null)
      return
    }
    try {
      field.onChange(JSON.parse(text))
      setInvalid(false)
    } catch {
      setInvalid(true)
    }
  }

  return (
    <Field
      label={label}
      hint={[t('form.json.hint'), description].filter(Boolean).join(' ')}
      error={invalid ? t('form.json.invalid') : serverError}
      required={required && !node.nullable}
    >
      {(control) => (
        <textarea
          {...control}
          ref={field.ref}
          rows={Math.min(12, Math.max(3, text.split('\n').length))}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={apply}
          className={cn(controlClass, 'py-2 font-mono text-xs')}
        />
      )}
    </Field>
  )
}
