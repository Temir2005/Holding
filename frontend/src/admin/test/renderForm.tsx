import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { adminKey, type Meta } from '../api/queries'
import entityTypesFixture from '../forms/schema/__fixtures__/entity-types.json'
import sectionTypes from '../forms/schema/__fixtures__/section-types.json'
import { SchemaForm } from '../forms/schema/SchemaForm'
import type { JsonSchema } from '../forms/schema/types'
import { useSchemaForm } from '../forms/schema/useSchemaForm'
import { emptyForm, type Values } from '../forms/schema/values'
import { ConfirmProvider } from '../ui/Confirm'
import { ToastProvider } from '../ui/Toast'
import { TooltipProvider } from '../ui/Tooltip'

/** Real schemas from `GET /admin/section-types` (backend dump). */
export const allSectionTypes = sectionTypes as unknown as {
  type: string
  label: string
  schema: JsonSchema
}[]

export function schemaOf(type: string): JsonSchema {
  const info = allSectionTypes.find((s) => s.type === type)
  if (!info) throw new Error(`No section type ${type} in the fixture`)
  return info.schema
}

export const testMeta = {
  locales: [
    { code: 'ru', label: 'Русский' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'en', label: 'English' },
  ],
  default_locale: 'ru',
  divisions: [
    { value: 'development', label: 'Девелопмент' },
    { value: 'smart-panels', label: 'Смарт-панели' },
  ],
  stat_contexts: [
    { value: 'home', label: 'home' },
    { value: 'development', label: 'development' },
  ],
  media: {
    image_mb: 20,
    video_mb: 200,
    types: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/webp',
      'video/mp4',
    ],
  },
  media_kinds: [
    { value: 'image', label: 'Изображения' },
    { value: 'svg', label: 'SVG' },
    { value: 'video', label: 'Видео' },
    { value: 'document', label: 'Документы' },
  ],
  media_folders: [{ value: 'projects', label: 'projects' }],
} as unknown as Meta

/** Real form schemas of non-block entities (`GET /admin/entity-types`). */
export const entityTypes = entityTypesFixture as unknown as {
  type: string
  label: string
  schema: JsonSchema
}[]

export function entitySchema(type: string): JsonSchema {
  const info = entityTypes.find((e) => e.type === type)
  if (!info) throw new Error(`No entity type ${type} in the fixture`)
  return info.schema
}

export function withProviders(ui: ReactElement, initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData([...adminKey, 'meta'], testMeta)
  queryClient.setQueryData([...adminKey, 'entity-types'], entityTypes)
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <TooltipProvider>
          <ToastProvider>
            <ConfirmProvider>{ui}</ConfirmProvider>
          </ToastProvider>
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function Harness({
  schema,
  values,
  onSubmit,
  formErrors,
  expose,
}: {
  schema: JsonSchema
  values: Values
  onSubmit: (values: Values) => void
  formErrors?: string[]
  expose?: (form: ReturnType<typeof useSchemaForm>) => void
}) {
  const form = useSchemaForm(schema, values)
  expose?.(form)
  return (
    <SchemaForm schema={schema} form={form} onSubmit={onSubmit} formErrors={formErrors}>
      <button type="submit">submit</button>
    </SchemaForm>
  )
}

/** Renders a form for a schema; `submit()` clicks submit, `onSubmit` gets stored values. */
export function renderForm(
  schema: JsonSchema,
  values: Values = emptyForm(schema),
  options: { formErrors?: string[] } = {},
) {
  const onSubmit = vi.fn<(values: Values) => void>()
  let form: ReturnType<typeof useSchemaForm> | undefined
  const user = userEvent.setup()
  const view = render(
    withProviders(
      <Harness
        schema={schema}
        values={values}
        onSubmit={onSubmit}
        formErrors={options.formErrors}
        expose={(f) => {
          form = f
        }}
      />,
    ),
  )
  const submit = () => user.click(view.getByRole('button', { name: 'submit' }))
  const getForm = () => {
    if (!form) throw new Error('form not rendered')
    return form
  }
  return { ...view, user, onSubmit, submit, getForm }
}
