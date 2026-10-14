import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { FieldIssue } from '../../api/errors'
import { sectionTypesQuery } from '../../api/queries'
import { useSaveShortcut, useUnsavedGuard } from '../../forms/guards'
import { applyServerErrors } from '../../forms/schema/errors'
import { SchemaForm } from '../../forms/schema/SchemaForm'
import type { JsonSchema } from '../../forms/schema/types'
import { useSchemaForm } from '../../forms/schema/useSchemaForm'
import { emptyForm, type Values } from '../../forms/schema/values'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Alert, Skeleton } from '../../ui/feedback'
import { controlClass } from '../../ui/styles'
import { PageTitle } from '../Placeholder'

const FORM_ID = 'block-form'

function BlockForm({ schema }: { schema: JsonSchema }) {
  const t = useT()
  const form = useSchemaForm(schema, emptyForm(schema))
  const [stored, setStored] = useState<Values | null>(null)
  const [formErrors, setFormErrors] = useState<string[]>([])
  useUnsavedGuard(form.formState.isDirty)
  useSaveShortcut(() => {
    const element = document.getElementById(FORM_ID)
    if (element instanceof HTMLFormElement) element.requestSubmit()
  })

  // Shows how a 422 from the server lands on fields: the first property, plus one that
  // matches nothing in the form (goes above the fields).
  const simulate = () => {
    const first = Object.keys(schema.properties ?? {})[0] ?? 'title'
    const issues: FieldIssue[] = [
      { loc: ['body', 'data', first], msg: 'Ошибка с сервера для этого поля' },
      { loc: ['body', 'data', 'no_such_field'], msg: 'Ошибка без поля в форме' },
    ]
    setFormErrors(applyServerErrors(form, schema, issues, { strip: ['data'] }))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="rounded-lg border border-line bg-panel p-4 md:p-6">
        <SchemaForm
          id={FORM_ID}
          schema={schema}
          form={form}
          formErrors={formErrors}
          onSubmit={(values) => {
            setFormErrors([])
            setStored(values)
          }}
        >
          <div className="flex flex-col-reverse gap-2 md:flex-row">
            <Button onClick={simulate}>{t('dev.forms.simulate')}</Button>
            <Button type="submit" variant="primary">
              {t('dev.forms.check')}
            </Button>
          </div>
        </SchemaForm>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm">{t('dev.forms.stored')}</h2>
        {stored && <Alert tone="success">{t('dev.forms.valid')}</Alert>}
        <pre
          data-testid="stored"
          className="max-h-[70dvh] overflow-auto rounded-lg bg-sunken p-3 font-mono text-xs"
        >
          {stored ? JSON.stringify(stored, null, 2) : '—'}
        </pre>
      </div>
    </div>
  )
}

/** Development only: every block type's form, built from `GET /admin/section-types`. */
export function FormsPlayground() {
  const t = useT()
  const { data, isPending } = useQuery(sectionTypesQuery())
  const [type, setType] = useState<string | null>(null)
  const current = data?.find((s) => s.type === type) ?? data?.[0]

  return (
    <>
      <PageTitle>{t('dev.forms.title')}</PageTitle>
      <p className="mb-4 max-w-2xl text-sm text-mute">{t('dev.forms.note')}</p>
      {isPending || !data || !current ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-4">
          <Field label={t('dev.forms.type')} hint={current.description}>
            {(control) => (
              <select
                {...control}
                value={current.type}
                onChange={(e) => setType(e.target.value)}
                className={`${controlClass} md:max-w-md`}
              >
                {data.map((s) => (
                  <option key={s.type} value={s.type}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <BlockForm key={current.type} schema={current.schema as JsonSchema} />
        </div>
      )}
    </>
  )
}
