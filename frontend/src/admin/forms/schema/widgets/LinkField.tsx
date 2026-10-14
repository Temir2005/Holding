import { useId, useState } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { Search } from 'lucide-react'
import { useT } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { EntityPicker } from '../../EntityPicker'
import { controlClass } from '../../../ui/styles'
import { useFieldError } from '../useFieldError'
import type { WidgetProps } from '../registry'
import {
  buildHref,
  linkMode,
  linkTarget,
  LINK_MODES as MODES,
  PROJECT_PREFIX,
  type LinkMode,
} from '../../link'

/** `x-widget: link`: a page, a project, an anchor or an external address. */
export function LinkField({ name, node, required, label, description }: WidgetProps) {
  const t = useT()
  const id = useId()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const href = (field.value as string | null) ?? ''
  const [mode, setMode] = useState<LinkMode>(() => linkMode(href))
  const target = linkTarget(href, mode)
  const nullable = node.nullable
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerKind = mode === 'page' ? 'page' : mode === 'project' ? 'project' : null

  const update = (nextMode: LinkMode, nextTarget: string) => {
    const next = buildHref(nextMode, nextTarget)
    field.onChange(next === '' && nullable ? null : next)
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">
        {label}
        {required && !nullable && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div role="radiogroup" aria-label={t('form.link.mode')} className="flex flex-wrap gap-1">
        {MODES.map((m) => (
          <label
            key={m}
            className={cn(
              'flex min-h-touch cursor-pointer items-center rounded border px-3 text-sm md:min-h-8',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              m === mode
                ? 'border-fg bg-fg text-canvas'
                : 'border-line-strong bg-panel hover:bg-sunken',
            )}
          >
            <input
              type="radio"
              name={`${id}-mode`}
              className="sr-only"
              checked={m === mode}
              onChange={() => {
                setMode(m)
                update(m, linkTarget(href, linkMode(href)))
              }}
            />
            {t(`form.link.modes.${m}`)}
          </label>
        ))}
      </div>
      <div className="flex items-stretch">
        {(mode === 'anchor' || mode === 'project') && (
          <span className="flex items-center rounded-l border border-r-0 border-line-strong bg-sunken px-2 font-mono text-sm text-mute">
            {mode === 'anchor' ? '#' : PROJECT_PREFIX}
          </span>
        )}
        <input
          id={id}
          ref={field.ref}
          aria-label={`${label}: ${t(`form.link.modes.${mode}`)}`}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          aria-invalid={error ? true : undefined}
          inputMode={mode === 'external' ? 'url' : undefined}
          value={target}
          onBlur={field.onBlur}
          onChange={(e) => update(mode, e.target.value.trim())}
          className={cn(
            controlClass,
            'font-mono',
            (mode === 'anchor' || mode === 'project') && 'rounded-l-none',
          )}
        />
        {pickerKind && (
          <Button
            size="sm"
            icon={<Search size={16} aria-hidden="true" />}
            className="ml-2 shrink-0 self-center"
            onClick={() => setPickerOpen(true)}
          >
            {t(pickerKind === 'page' ? 'refs.pickPage' : 'refs.pickProject')}
          </Button>
        )}
      </div>
      {pickerKind && (
        <EntityPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          kind={pickerKind}
          title={t(pickerKind === 'page' ? 'refs.pickPage' : 'refs.pickProject')}
          onPick={([card]) => card?.slug && update(mode, card.slug)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
      <p id={`${id}-hint`} className="text-xs text-mute">
        {t(`form.link.hints.${mode}`)}
        {description ? ` ${description}` : ''}
      </p>
    </fieldset>
  )
}
