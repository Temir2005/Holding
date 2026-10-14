import { Search } from 'lucide-react'
import { useState } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { useT } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { Field } from '../../../ui/Field'
import { controlClass } from '../../../ui/styles'
import { EntityPicker } from '../../EntityPicker'
import type { WidgetProps } from '../registry'
import { useFieldError } from '../useFieldError'

/** `x-widget: page`: the address (slug) of a page, typed or chosen from the list. */
export function PageField({ name, node, required, label, description }: WidgetProps) {
  const t = useT()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const [open, setOpen] = useState(false)
  const set = (slug: string) => field.onChange(slug === '' && node.nullable ? null : slug)
  return (
    <Field label={label} hint={description} error={error} required={required && !node.nullable}>
      {(control) => (
        <div className="flex items-center gap-2">
          <input
            {...control}
            ref={field.ref}
            value={(field.value as string | null) ?? ''}
            maxLength={node.schema.maxLength}
            onBlur={field.onBlur}
            onChange={(e) => set(e.target.value.trim())}
            className={cn(controlClass, 'font-mono md:max-w-md')}
          />
          <Button
            size="sm"
            icon={<Search size={16} aria-hidden="true" />}
            onClick={() => setOpen(true)}
          >
            {t('refs.pickPage')}
          </Button>
          <EntityPicker
            open={open}
            onOpenChange={setOpen}
            kind="page"
            title={t('refs.pickPage')}
            onPick={([card]) => card?.slug && set(card.slug)}
          />
        </div>
      )}
    </Field>
  )
}
