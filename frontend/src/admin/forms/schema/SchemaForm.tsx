import { useMemo, useState, type ReactNode } from 'react'
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { useT } from '../../i18n'
import { Alert } from '../../ui/feedback'
import { findLocales, SchemaFormContext } from './context'
import { LocaleSwitch } from './LocaleSwitch'
import { ObjectFields } from './ObjectFields'
import { resolveNode } from './resolve'
import type { JsonSchema } from './types'
import { formToStored, type Values } from './values'
import './widgets'

interface SchemaFormProps {
  schema: JsonSchema
  form: UseFormReturn<FieldValues>
  /** Receives values in the stored shape of the data. */
  onSubmit: (values: Values) => void | Promise<void>
  /** Problems that belong to no field (server errors), shown above the fields. */
  formErrors?: string[]
  id?: string
  className?: string
  /** Actions under the fields (save button…). */
  children?: ReactNode
}

/**
 * A form built from a JSON Schema with admin hints. It knows nothing about blocks: a new
 * block type on the backend gets its form without changes here.
 */
export function SchemaForm({
  schema,
  form,
  onSubmit,
  formErrors = [],
  id,
  className,
  children,
}: SchemaFormProps) {
  const t = useT()
  const locales = useMemo(() => findLocales(schema), [schema])
  const [locale, setLocale] = useState(
    () => locales.find((l) => l.required)?.code ?? locales[0]?.code ?? 'ru',
  )
  const context = useMemo(
    () => ({ root: schema, locales, locale, setLocale }),
    [schema, locales, locale],
  )
  const { isSubmitted, errors } = form.formState
  const showSummary = isSubmitted && Object.keys(errors).length > 0

  return (
    <SchemaFormContext.Provider value={context}>
      <FormProvider {...form}>
        <form
          id={id}
          noValidate
          className={cn('flex flex-col gap-5', className)}
          onSubmit={form.handleSubmit((values) => onSubmit(formToStored(schema, values)))}
        >
          {locales.length > 1 && (
            <div className="sticky top-0 z-[1] -mx-1 flex items-center gap-3 bg-panel/95 px-1 py-2 backdrop-blur">
              <span className="text-sm text-mute">{t('form.locale.label')}</span>
              <LocaleSwitch />
            </div>
          )}
          {formErrors.length > 0 && (
            <Alert tone="danger" title={t('form.serverErrors')}>
              <ul className="list-disc pl-4">
                {formErrors.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}
          {showSummary && formErrors.length === 0 && (
            <Alert tone="danger">{t('form.hasErrors')}</Alert>
          )}
          <ObjectFields schema={resolveNode(schema, schema).schema} prefix="" />
          {children}
        </form>
      </FormProvider>
    </SchemaFormContext.Provider>
  )
}
