import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { metaOptions, metaQuery } from '../../../api/queries'
import { useT } from '../../../i18n'
import { Field } from '../../../ui/Field'
import { controlClass } from '../../../ui/styles'
import { useSchemaFormContext } from '../context'
import { useFieldError } from '../useFieldError'
import type { WidgetProps } from '../registry'
import { itemNode } from '../resolve'
import type { JsonSchema } from '../types'

interface Choice {
  value: string | number
  label: string
}

function choicesOf(schema: JsonSchema): Choice[] {
  const labels = schema['x-enum-labels'] ?? {}
  return (schema.enum ?? []).map((value) => ({
    value,
    label: labels[String(value)] ?? String(value),
  }))
}

/** Up to this many choices are shown as buttons; more go into a dropdown. */
const SEGMENTED_MAX = 4

function Select({
  control,
  choices,
  value,
  nullable,
  onChange,
  onBlur,
  selectRef,
}: {
  control: object
  choices: Choice[]
  value: unknown
  nullable: boolean
  onChange: (value: string | number | null) => void
  onBlur: () => void
  selectRef: (el: HTMLSelectElement | null) => void
}) {
  const t = useT()
  const known = choices.some((c) => c.value === value)
  return (
    <select
      {...control}
      ref={selectRef}
      value={value === null || value === undefined ? '' : String(value)}
      onBlur={onBlur}
      onChange={(e) => {
        const picked = choices.find((c) => String(c.value) === e.target.value)
        onChange(picked ? picked.value : e.target.value === '' ? null : e.target.value)
      }}
      className={cn(controlClass, 'md:max-w-md')}
    >
      {(nullable || value === null || value === undefined) && (
        <option value="">{t('form.none')}</option>
      )}
      {/* A stored value missing from the list stays visible instead of silently changing. */}
      {!known && value !== null && value !== undefined && (
        <option value={String(value)}>{String(value)}</option>
      )}
      {choices.map((c) => (
        <option key={String(c.value)} value={String(c.value)}>
          {c.label}
        </option>
      ))}
    </select>
  )
}

export function EnumField({ name, node, required, label, description }: WidgetProps) {
  const id = useId()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const choices = choicesOf(node.schema)

  if (choices.length > SEGMENTED_MAX || node.nullable) {
    return (
      <Field label={label} hint={description} error={error} required={required && !node.nullable}>
        {(control) => (
          <Select
            control={control}
            choices={choices}
            value={field.value}
            nullable={node.nullable}
            onChange={field.onChange}
            onBlur={field.onBlur}
            selectRef={field.ref}
          />
        )}
      </Field>
    )
  }

  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={description ? `${id}-hint` : undefined}
    >
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
        {choices.map((c, i) => {
          const checked = field.value === c.value
          return (
            <label
              key={String(c.value)}
              className={cn(
                'flex min-h-touch cursor-pointer items-center rounded border px-3 text-sm md:min-h-9',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                checked
                  ? 'border-fg bg-fg text-canvas'
                  : 'border-line-strong bg-panel hover:bg-sunken',
              )}
            >
              <input
                type="radio"
                ref={i === 0 ? field.ref : undefined}
                name={`${id}-${name}`}
                className="sr-only"
                checked={checked}
                onChange={() => field.onChange(c.value)}
                onBlur={field.onBlur}
              />
              {c.label}
            </label>
          )
        })}
      </div>
      {description && (
        <p id={`${id}-hint`} className="text-xs text-mute">
          {description}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  )
}

/** A list of enum values (e.g. lead topics): a group of checkboxes, in schema order. */
export function EnumListField({ name, node, label, description }: WidgetProps) {
  const id = useId()
  const { root } = useSchemaFormContext()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const choices = choicesOf(itemNode(node.schema, root).schema)
  const selected = new Set((field.value as (string | number)[] | null) ?? [])

  const toggle = (value: string | number) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    field.onChange(choices.map((c) => c.value).filter((v) => next.has(v)))
  }

  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={description ? `${id}-hint` : undefined}
    >
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {choices.map((c, i) => (
          <label
            key={String(c.value)}
            className="flex min-h-touch items-center gap-2 text-sm md:min-h-8"
          >
            <input
              type="checkbox"
              ref={i === 0 ? field.ref : undefined}
              checked={selected.has(c.value)}
              onChange={() => toggle(c.value)}
              onBlur={field.onBlur}
              className="h-4 w-4 accent-[rgb(var(--a-accent-ink))]"
            />
            {c.label}
          </label>
        ))}
      </div>
      {description && (
        <p id={`${id}-hint`} className="text-xs text-mute">
          {description}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  )
}

/** `x-widget: select` + `x-options: <name>`: choices from `GET /admin/meta`. */
export function OptionsField({ name, node, required, label, description }: WidgetProps) {
  const { field } = useController({ name })
  const error = useFieldError(name)
  const { data: meta } = useQuery(metaQuery())
  const choices = metaOptions(meta, node.schema['x-options'] ?? '').map((o) => ({
    value: o.value,
    label: o.label,
  }))
  return (
    <Field label={label} hint={description} error={error} required={required && !node.nullable}>
      {(control) => (
        <Select
          control={control}
          choices={choices}
          value={field.value}
          nullable={node.nullable}
          onChange={field.onChange}
          onBlur={field.onBlur}
          selectRef={field.ref}
        />
      )}
    </Field>
  )
}
