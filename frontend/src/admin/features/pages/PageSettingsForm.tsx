import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode, type FieldIssue } from '../../api/errors'
import type { Usage } from '../../api/media'
import {
  pageDetailQuery,
  pagesKey,
  type PageDetail,
  type PageSummary,
  type PageUpdate,
} from '../../api/pages'
import { entityTypesQuery } from '../../api/queries'
import { rememberCards } from '../../api/refCards'
import { InUseDialog, VersionConflictDialog } from '../../forms/conflicts'
import { useSaveShortcut, useUnsavedGuard } from '../../forms/guards'
import { applyServerErrors } from '../../forms/schema/errors'
import { SchemaForm } from '../../forms/schema/SchemaForm'
import type { JsonSchema } from '../../forms/schema/types'
import { useSchemaForm } from '../../forms/schema/useSchemaForm'
import type { Values } from '../../forms/schema/values'
import { usagesFromDetails } from '../../forms/usage'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Alert, Skeleton } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'

const FORM_ID = 'page-settings-form'

const hasText = (v: unknown) => typeof v === 'object' && v !== null && Object.keys(v).length > 0

function pageValues(page: PageSummary, schema: JsonSchema): Values {
  const all: Values = {
    slug: page.slug,
    title: page.title,
    seo_title: hasText(page.seo_title) ? page.seo_title : null,
    seo_description: hasText(page.seo_description) ? page.seo_description : null,
    og_image_id: page.og_image_id,
  }
  return Object.fromEntries(Object.keys(schema.properties ?? {}).map((k) => [k, all[k] ?? null]))
}

function SettingsForm({
  page,
  schema,
  issues,
}: {
  page: PageDetail
  schema: JsonSchema
  issues?: FieldIssue[]
}) {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  // The version being edited: the loaded page, then each saved one.
  const [edited, setEdited] = useState<PageSummary>(page)
  const [initial] = useState(() => pageValues(page, schema))
  const form = useSchemaForm(schema, initial)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [conflict, setConflict] = useState<Values | null>(null)
  const [inUse, setInUse] = useState<Usage[] | null>(null)

  useUnsavedGuard(form.formState.isDirty)

  const adopt = useCallback(
    (fresh: PageSummary) => {
      setEdited(fresh)
      form.reset(pageValues(fresh, schema))
    },
    [form, schema],
  )

  // A newer version arrived (published, someone else saved): shown at once unless there are
  // edits; with edits, saving stops with the version conflict dialog instead of losing them.
  useEffect(() => {
    if (page.version > edited.version && !form.formState.isDirty) adopt(page)
  }, [page, edited.version, form, adopt])
  // Problems found when publishing (the share picture…) show on the fields.
  useEffect(() => {
    if (issues?.length) setFormErrors(applyServerErrors(form, schema, issues))
  }, [issues, form, schema])
  useSaveShortcut(() => {
    const element = document.getElementById(FORM_ID)
    if (element instanceof HTMLFormElement) element.requestSubmit()
  })

  const save = useMutation({
    mutationFn: (values: Values) =>
      api.patch('/api/v1/admin/pages/{page_id}', {
        path: { page_id: page.id },
        body: { ...values, version: edited.version } as PageUpdate,
      }),
    onSuccess: (saved) => {
      adopt(saved)
      void queryClient.invalidateQueries({ queryKey: pageDetailQuery(page.id).queryKey })
      void queryClient.invalidateQueries({ queryKey: [...pagesKey, 'list'] })
      setFormErrors([])
      toast.success(t('pages.settingsSaved'))
    },
    onError: (error, values) => {
      if (!(error instanceof AdminApiError)) return toast.error(error)
      if (error.code === ErrorCode.versionConflict) setConflict(values)
      else if (error.code === ErrorCode.inUse) setInUse(usagesFromDetails(error.details))
      else if (error.code === ErrorCode.alreadyExists)
        form.setError('slug', { type: 'server', message: error.message }, { shouldFocus: true })
      else if (error.fieldIssues.length > 0)
        setFormErrors(applyServerErrors(form, schema, error.fieldIssues))
      else toast.error(error)
    },
  })

  return (
    <>
      <Alert tone="info">{t('pages.draftNote')}</Alert>
      <SchemaForm
        id={FORM_ID}
        schema={schema}
        form={form}
        formErrors={formErrors}
        onSubmit={(values) => save.mutate(values)}
        className="mt-4"
      >
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            loading={save.isPending}
            disabled={!form.formState.isDirty}
          >
            {t('common.save')}
          </Button>
        </div>
      </SchemaForm>
      <VersionConflictDialog
        open={conflict !== null}
        edits={conflict}
        onReload={() => {
          setConflict(null)
          void queryClient
            .fetchQuery({ ...pageDetailQuery(page.id), staleTime: 0 })
            .then(adopt, (error: unknown) => toast.error(error))
        }}
        onKeep={() => setConflict(null)}
      />
      <InUseDialog usages={inUse} onClose={() => setInUse(null)} />
    </>
  )
}

/** "Settings and SEO" tab: address, title, SEO and the share picture, from the page schema. */
export function PageSettingsForm({ page, issues }: { page: PageDetail; issues?: FieldIssue[] }) {
  const queryClient = useQueryClient()
  const { data: entities } = useQuery(entityTypesQuery())
  const schema = entities?.find((e) => e.type === 'page')?.schema as JsonSchema | undefined
  useEffect(() => {
    if (page.og_image) rememberCards(queryClient, 'media', [page.og_image])
  }, [page.og_image, queryClient])
  if (!schema) return <Skeleton className="h-64" />
  return <SettingsForm key={page.id} page={page} schema={schema} issues={issues} />
}
