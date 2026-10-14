import { useId } from 'react'
import { get, useController, useFormState } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { useT } from '../../../i18n'
import { controlClass } from '../../../ui/styles'
import { useSchemaFormContext, type FormLocale } from '../context'
import type { WidgetProps } from '../registry'
import { localizedVariant } from '../resolve'
import { MarkdownEditor } from './MarkdownEditor'

type LocalizedValue = Record<string, string | null | undefined>

const filled = (text: string | null | undefined) => typeof text === 'string' && text.trim() !== ''

/** First error message under this field: on the field itself or on one of its languages. */
function useLocalizedError(name: string, locales: FormLocale[]): string | undefined {
  const { errors } = useFormState({ name })
  const own: unknown = get(errors, name)
  const message = (e: unknown) => {
    const m = (e as { message?: unknown } | undefined)?.message
    return typeof m === 'string' ? m : undefined
  }
  return (
    message(own) ??
    locales.map((l) => message(get(errors, `${name}.${l.code}`))).find((m) => m !== undefined)
  )
}

/** Dots that show which languages are filled; a click switches the whole form. */
function LocaleDots({ value, requiredField }: { value: LocalizedValue; requiredField: boolean }) {
  const t = useT()
  const { locales, locale, setLocale } = useSchemaFormContext()
  if (locales.length < 2) return null
  return (
    <span className="flex items-center gap-1">
      {locales.map((l) => {
        const short = t(`locales.short.${l.code}`, { defaultValue: l.code.toUpperCase() })
        const isFilled = filled(value[l.code])
        const missing = !isFilled && l.required && requiredField
        const state = isFilled
          ? t('form.locale.filled', { lang: short })
          : missing
            ? t('form.locale.requiredEmpty', { lang: short })
            : t('form.locale.empty', { lang: short })
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            aria-label={`${state}. ${t('form.locale.switchTo', { lang: short })}`}
            title={state}
            className={cn(
              'inline-flex min-h-touch items-center gap-1 rounded px-1 font-mono text-[11px] md:min-h-6',
              l.code === locale ? 'text-fg' : 'text-mute hover:text-fg',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'block h-2 w-2 rounded-full border',
                isFilled && 'border-success bg-success',
                missing && 'border-danger bg-danger',
                !isFilled && !missing && 'border-line-strong',
              )}
            />
            {short}
          </button>
        )
      })}
    </span>
  )
}

export function LocalizedField({ name, node, required, label, description }: WidgetProps) {
  const t = useT()
  const id = useId()
  const { locales, locale } = useSchemaFormContext()
  const { field } = useController({ name })
  const error = useLocalizedError(name, locales)
  const variant = localizedVariant(node.schema) ?? 'text'

  const value: LocalizedValue = (field.value as LocalizedValue | null) ?? {}
  const current = locales.find((l) => l.code === locale)
  const base = locales.find((l) => l.required)
  const text = value[locale] ?? ''
  // A required text needs its base language; an optional one may stay empty.
  const requiredField = required && !node.nullable
  const baseText = base ? (value[base.code] ?? '') : ''
  const showsFallback = Boolean(current && !current.required && !filled(text) && filled(baseText))

  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error && errorId, (showsFallback || description) && hintId]
    .filter(Boolean)
    .join(' ')

  const setText = (next: string) => field.onChange({ ...value, [locale]: next })
  const common = {
    id,
    lang: locale,
    value: text,
    placeholder: showsFallback ? baseText : undefined,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-required': requiredField && current?.required ? true : undefined,
    onBlur: field.onBlur,
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {requiredField && (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <LocaleDots value={value} requiredField={requiredField} />
      </div>
      {variant === 'markdown' ? (
        <MarkdownEditor
          id={id}
          value={text}
          onChange={setText}
          onBlur={field.onBlur}
          inputRef={field.ref}
          lang={locale}
          placeholder={common.placeholder}
          describedBy={common['aria-describedby']}
          invalid={Boolean(error)}
        />
      ) : variant === 'textarea' ? (
        <textarea
          {...common}
          ref={field.ref}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          className={cn(controlClass, 'py-2')}
        />
      ) : (
        <input
          {...common}
          ref={field.ref}
          onChange={(e) => setText(e.target.value)}
          className={controlClass}
        />
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
      {(showsFallback || description) && (
        <p id={hintId} className="text-xs text-mute">
          {showsFallback ? t('form.locale.fallback') : description}
        </p>
      )}
    </div>
  )
}
