import { useState } from 'react'
import { useController } from 'react-hook-form'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { useT } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { Dialog } from '../../../ui/Dialog'
import { Field } from '../../../ui/Field'
import { controlClass } from '../../../ui/styles'
import { useFieldError } from '../useFieldError'
import type { WidgetProps } from '../registry'

/** `x-widget: icon`: the site's icon set (names from the schema `enum`), with search. */
export function IconField({ name, node, required, label, description }: WidgetProps) {
  const t = useT()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const names = (node.schema.enum ?? []).map(String)
  const value = (field.value as string | null) ?? ''
  const shown = names.filter((n) => n.includes(query.trim().toLowerCase()))

  const pick = (icon: string) => {
    field.onChange(icon)
    setOpen(false)
    setQuery('')
  }

  return (
    <Field label={label} hint={description} error={error} required={required && !node.nullable}>
      {(control) => (
        <>
          <Button
            {...control}
            ref={field.ref}
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={
              value
                ? `${label}: ${value}. ${t('form.icon.change')}`
                : `${label}: ${t('form.icon.choose')}`
            }
            className="justify-start self-start"
            icon={value ? <Icon name={value} className="h-5 w-5" /> : undefined}
          >
            {value ? <span className="font-mono">{value}</span> : t('form.icon.choose')}
          </Button>
          <Dialog open={open} onOpenChange={setOpen} title={t('form.icon.dialog')} size="lg">
            <div className="flex flex-col gap-3">
              <input
                type="search"
                autoFocus
                aria-label={t('form.icon.search')}
                placeholder={t('form.icon.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={controlClass}
              />
              {shown.length === 0 ? (
                <p className="text-sm text-mute">{t('form.icon.nothing')}</p>
              ) : (
                <ul className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {shown.map((icon) => (
                    <li key={icon}>
                      <button
                        type="button"
                        aria-pressed={icon === value}
                        onClick={() => pick(icon)}
                        className={cn(
                          'flex w-full flex-col items-center gap-1 rounded border p-3 text-xs',
                          icon === value
                            ? 'border-fg bg-sunken'
                            : 'border-line hover:border-line-strong hover:bg-sunken',
                        )}
                      >
                        <Icon name={icon} className="h-6 w-6" />
                        <span className="w-full truncate font-mono">{icon}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Dialog>
        </>
      )}
    </Field>
  )
}
