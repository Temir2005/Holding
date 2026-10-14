import { Plus, X } from 'lucide-react'
import { useController } from 'react-hook-form'
import { useT } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { useSchemaFormContext } from '../context'
import { useFieldError } from '../useFieldError'
import { ObjectFields } from '../ObjectFields'
import type { WidgetProps } from '../registry'
import { emptyValue } from '../values'

/** A nested object: a group of fields; an optional one can be added and removed. */
export function ObjectField({ name, node, label, description }: WidgetProps) {
  const t = useT()
  const { root } = useSchemaFormContext()
  const { field } = useController({ name })
  const error = useFieldError(name)

  if (node.nullable && (field.value === null || field.value === undefined)) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        <Button
          ref={field.ref}
          size="sm"
          icon={<Plus size={16} aria-hidden="true" />}
          className="self-start"
          onClick={() =>
            // The field's own default is null ("not set"); build the object from its properties.
            field.onChange(
              emptyValue({ schema: { ...node.schema, default: undefined }, nullable: false }, root),
            )
          }
        >
          {t('form.object.add', { title: label })}
        </Button>
        {description && <p className="text-xs text-mute">{description}</p>}
      </div>
    )
  }

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-line p-3 md:p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-medium">{label}</legend>
      {node.nullable && (
        <Button
          size="sm"
          variant="ghost"
          icon={<X size={16} aria-hidden="true" />}
          className="-mt-2 self-end"
          onClick={() => field.onChange(null)}
        >
          {t('form.object.remove')}
        </Button>
      )}
      {description && <p className="-mt-2 text-xs text-mute">{description}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <ObjectFields schema={node.schema} prefix={name} />
    </fieldset>
  )
}
