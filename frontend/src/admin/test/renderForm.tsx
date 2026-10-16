import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
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
  project_statuses: [
    { value: 'completed', label: 'Реализован' },
    { value: 'in_progress', label: 'Строится' },
    { value: 'planned', label: 'В планах' },
  ],
  employment_types: [{ value: 'full_time', label: 'Полная занятость' }],
  client_industries: [{ value: 'finance', label: 'Финансы' }],
  lead_types: [
    { value: 'investor', label: 'Инвестиции' },
    { value: 'partner', label: 'Партнёрство' },
  ],
  lead_statuses: [
    { value: 'new', label: 'Новая' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'done', label: 'Обработана' },
    { value: 'spam', label: 'Спам' },
  ],
  user_roles: [
    { value: 'admin', label: 'Администратор' },
    { value: 'editor', label: 'Редактор' },
  ],
  audit_actions: [
    { value: 'update', label: 'Изменение' },
    { value: 'publish', label: 'Публикация' },
  ],
  audit_entity_types: [
    { value: 'project', label: 'Проект' },
    { value: 'page', label: 'Страница' },
  ],
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

/**
 * Providers of the admin around `ui`, inside a data router (the unsaved-changes guard needs
 * one). `routePath` gives route params, e.g. `/admin/pages/:pageId`.
 */
export function withProviders(ui: ReactElement, initialPath = '/', routePath = '*') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData([...adminKey, 'meta'], testMeta)
  queryClient.setQueryData([...adminKey, 'entity-types'], entityTypes)
  queryClient.setQueryData([...adminKey, 'section-types'], allSectionTypes)
  const router = createMemoryRouter(
    [
      {
        path: routePath,
        element: (
          <TooltipProvider>
            <ToastProvider>
              <ConfirmProvider>{ui}</ConfirmProvider>
            </ToastProvider>
          </TooltipProvider>
        ),
      },
      // Links leave the tested screen; the router still needs somewhere to go.
      { path: '*', element: <p>elsewhere</p> },
    ],
    { initialEntries: [initialPath] },
  )
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </HelmetProvider>
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
