import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode } from '../../api/errors'
import { entityTypesQuery } from '../../api/queries'
import { rememberRefs } from '../../api/refCards'
import { settingsQuery, type SiteSettings, type SiteSettingsUpdate } from '../../api/settings'
import { VersionConflictDialog } from '../../forms/conflicts'
import { useSaveShortcut, useUnsavedGuard } from '../../forms/guards'
import { applyServerErrors } from '../../forms/schema/errors'
import { SchemaForm } from '../../forms/schema/SchemaForm'
import type { JsonSchema } from '../../forms/schema/types'
import { useSchemaForm } from '../../forms/schema/useSchemaForm'
import { valuesFromRecord, type Values } from '../../forms/schema/values'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { ErrorState, Skeleton } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'
import { PageTitle } from '../Placeholder'

const FORM_ID = 'site-settings-form'

const settingsValues = (schema: JsonSchema, settings: SiteSettings) =>
  valuesFromRecord(schema, settings as unknown as Record<string, unknown>)

function SettingsForm({ settings, schema }: { settings: SiteSettings; schema: JsonSchema }) {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  // The version being edited: the loaded settings, then each saved version. Cards of the
  // referenced files are cached before the fields mount.
  const [edited, setEdited] = useState(() => {
    rememberRefs(queryClient, settings.refs)
    return settings
  })
  const [initial] = useState(() => settingsValues(schema, settings))
  const form = useSchemaForm(schema, initial)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [conflict, setConflict] = useState<Values | null>(null)

  useUnsavedGuard(form.formState.isDirty)
  useSaveShortcut(() => {
    const element = document.getElementById(FORM_ID)
    if (element instanceof HTMLFormElement) element.requestSubmit()
  })

  const adopt = useCallback(
    (fresh: SiteSettings) => {
      rememberRefs(queryClient, fresh.refs)
      setEdited(fresh)
      form.reset(settingsValues(schema, fresh))
    },
    [queryClient, form, schema],
  )

  // A newer version arrived: shown at once unless there are edits; with edits, saving
  // stops with the version conflict dialog instead of losing them.
  useEffect(() => {
    if (settings.version > edited.version && !form.formState.isDirty) adopt(settings)
  }, [settings, edited.version, form, adopt])

  const save = useMutation({
    mutationFn: (values: Values) =>
      api.put('/api/v1/admin/settings', {
        body: { ...values, version: edited.version } as SiteSettingsUpdate,
      }),
    onSuccess: (saved) => {
      adopt(saved)
      queryClient.setQueryData(settingsQuery().queryKey, saved)
      setFormErrors([])
      toast.success(t('settings.saved'))
    },
    onError: (error, values) => {
      if (!(error instanceof AdminApiError)) return toast.error(error)
      if (error.code === ErrorCode.versionConflict) setConflict(values)
      else if (error.fieldIssues.length > 0)
        setFormErrors(applyServerErrors(form, schema, error.fieldIssues))
      else toast.error(error)
    },
  })

  return (
    <>
      <SchemaForm
        id={FORM_ID}
        schema={schema}
        form={form}
        formErrors={formErrors}
        onSubmit={(values) => save.mutate(values)}
      >
        <div className="sticky bottom-0 z-[1] -mx-4 flex justify-end border-t border-line bg-panel/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-b-lg">
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
            .fetchQuery({ ...settingsQuery(), staleTime: 0 })
            .then(adopt, (error: unknown) => toast.error(error))
        }}
        onKeep={() => setConflict(null)}
      />
    </>
  )
}

/** Site settings (admin only): name, logo, menu, contacts, socials, footer, default SEO. */
export function SettingsPage() {
  const t = useT()
  const { data: entities } = useQuery(entityTypesQuery())
  const { data: settings, isPending, refetch } = useQuery(settingsQuery())
  const schema = entities?.find((e) => e.type === 'site_settings')?.schema as JsonSchema | undefined

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageTitle>{t('nav.settings')}</PageTitle>
      <p className="-mt-2 mb-4 text-sm text-mute md:-mt-4 md:mb-6">{t('settings.note')}</p>
      {isPending || !schema ? (
        <Skeleton className="h-96" />
      ) : settings ? (
        <SettingsForm settings={settings} schema={schema} />
      ) : (
        <ErrorState onRetry={() => void refetch()} />
      )}
    </div>
  )
}
