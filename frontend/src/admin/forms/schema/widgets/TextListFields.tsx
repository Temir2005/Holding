import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { metaOptions, metaQuery } from '../../../api/queries'
import { useT } from '../../../i18n'
import { Field } from '../../../ui/Field'
import { controlClass } from '../../../ui/styles'
import type { WidgetProps } from '../registry'
import { useFieldError } from '../useFieldError'

/** `x-widget: tags`: short strings as chips. Enter or comma adds, Backspace removes the last. */
export function TagsField({ name, node, label, description }: WidgetProps) {
  const t = useT()
  const id = useId()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const tags = (field.value as string[] | null) ?? []
  const [draft, setDraft] = useState('')
  const max = node.schema.maxItems

  const add = (raw: string) => {
    const tag = raw.trim()
    if (!tag || tags.includes(tag) || (max !== undefined && tags.length >= max)) return
    field.onChange([...tags, tag])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
      setDraft('')
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      field.onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div
        className={cn(
          'flex min-h-touch flex-wrap items-center gap-1.5 rounded border border-line-strong bg-panel px-2 py-1.5 md:min-h-9',
          error && 'border-danger',
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-sunken py-0.5 pl-2 text-sm"
          >
            {tag}
            <button
              type="button"
              aria-label={t('form.tags.remove', { tag })}
              onClick={() => field.onChange(tags.filter((x) => x !== tag))}
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-mute hover:text-fg md:min-h-6 md:min-w-6"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={field.ref}
          value={draft}
          placeholder={tags.length === 0 ? t('form.tags.placeholder') : undefined}
          aria-describedby={description ? `${id}-hint` : undefined}
          onChange={(e) => setDraft(e.target.value.replace(',', ''))}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(draft)
            setDraft('')
            field.onBlur()
          }}
          className="min-w-32 flex-1 bg-transparent text-base outline-none md:text-sm"
        />
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

/** `x-widget: combobox` + `x-options`: suggestions from meta, any new value allowed. */
export function ComboboxField({ name, node, required, label, description }: WidgetProps) {
  const t = useT()
  const listId = useId()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const { data: meta } = useQuery(metaQuery())
  const options = metaOptions(meta, node.schema['x-options'] ?? '')
  const hint = [description, t('form.combobox.hint')].filter(Boolean).join(' ')

  return (
    <Field label={label} hint={hint} error={error} required={required && !node.nullable}>
      {(control) => (
        <>
          <input
            {...control}
            ref={field.ref}
            list={listId}
            autoComplete="off"
            maxLength={node.schema.maxLength}
            value={(field.value as string | null) ?? ''}
            onBlur={field.onBlur}
            onChange={(e) =>
              field.onChange(e.target.value === '' && node.nullable ? null : e.target.value)
            }
            className={cn(controlClass, 'md:max-w-md')}
          />
          <datalist id={listId}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label !== o.value ? o.label : undefined}
              </option>
            ))}
          </datalist>
        </>
      )}
    </Field>
  )
}
