import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode } from '../../api/errors'
import { mediaKindOf, type MediaItem, type MediaPatch, type Usage } from '../../api/media'
import { entityTypesQuery, mediaItemQuery, mediaKey, mediaUsagesQuery } from '../../api/queries'
import { InUseDialog, UsageList, VersionConflictDialog } from '../../forms/conflicts'
import { useSaveShortcut } from '../../forms/guards'
import { applyServerErrors } from '../../forms/schema/errors'
import { SchemaForm } from '../../forms/schema/SchemaForm'
import type { JsonSchema } from '../../forms/schema/types'
import { useSchemaForm } from '../../forms/schema/useSchemaForm'
import type { Values } from '../../forms/schema/values'
import { usagesFromDetails } from '../../forms/usage'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { useConfirm } from '../../ui/confirm-context'
import { Skeleton } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'
import { displayName, formatBytes, formatDate, previewUrl } from './format'

const FORM_ID = 'media-card-form'

/** Values of the media form from a record: exactly the fields the form schema has. */
function formValues(item: MediaItem, schema: JsonSchema): Values {
  const all: Values = {
    alt: Object.keys(item.alt).length ? item.alt : null,
    original_filename: item.original_filename,
    folder: item.folder,
    tags: item.tags,
  }
  return Object.fromEntries(Object.keys(schema.properties ?? {}).map((k) => [k, all[k] ?? null]))
}

function Preview({ item }: { item: MediaItem }) {
  const t = useT()
  const kind = mediaKindOf(item.mime_type)
  if (kind === 'video') {
    return (
      <video
        src={item.url}
        controls
        preload="metadata"
        className="max-h-72 w-full rounded bg-sunken"
      />
    )
  }
  if (kind === 'document') {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-accent-ink underline"
      >
        {t('media.card.openOriginal')}
      </a>
    )
  }
  return (
    <div
      className="flex max-h-72 justify-center overflow-hidden rounded bg-sunken"
      style={{ backgroundColor: item.dominant_color ?? undefined }}
    >
      <img
        src={previewUrl(item, 960)}
        alt={item.alt.ru ?? ''}
        className="max-h-72 object-contain"
      />
    </div>
  )
}

function EditForm({
  item,
  schema,
  onDeleted,
}: {
  item: MediaItem
  schema: JsonSchema
  onDeleted: () => void
}) {
  const t = useT()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const form = useSchemaForm(schema, formValues(item, schema))
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [conflict, setConflict] = useState<Values | null>(null)
  const [inUse, setInUse] = useState<Usage[] | null>(null)

  const refresh = (fresh: MediaItem) => {
    queryClient.setQueryData(mediaItemQuery(fresh.id).queryKey, fresh)
    void queryClient.invalidateQueries({ queryKey: [...mediaKey, 'list'] })
    void queryClient.invalidateQueries({ queryKey: [...mediaKey, 'folders'] })
  }

  const save = useMutation({
    mutationFn: (values: Values) =>
      api.patch('/api/v1/admin/media/{media_id}', {
        path: { media_id: item.id },
        // Form values follow the media form schema, which mirrors MediaUpdate (backend test).
        body: { ...values, version: item.version } as MediaPatch,
      }),
    onSuccess: (fresh) => {
      refresh(fresh)
      form.reset(formValues(fresh, schema))
      setFormErrors([])
      toast.success(t('media.card.saved'))
    },
    onError: (error, values) => {
      if (error instanceof AdminApiError && error.code === ErrorCode.versionConflict) {
        setConflict(values)
      } else if (error instanceof AdminApiError && error.fieldIssues.length > 0) {
        setFormErrors(applyServerErrors(form, schema, error.fieldIssues))
      } else {
        toast.error(error)
      }
    },
  })

  const remove = useMutation({
    mutationFn: () =>
      api.delete('/api/v1/admin/media/{media_id}', {
        path: { media_id: item.id },
        query: { version: item.version },
      }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: mediaItemQuery(item.id).queryKey })
      void queryClient.invalidateQueries({ queryKey: mediaKey })
      toast.success(t('media.card.deleted'))
      onDeleted()
    },
    onError: (error) => {
      if (error instanceof AdminApiError && error.code === ErrorCode.inUse) {
        setInUse(usagesFromDetails(error.details))
      } else if (error instanceof AdminApiError && error.code === ErrorCode.versionConflict) {
        setConflict(form.getValues())
      } else {
        toast.error(error)
      }
    },
  })

  useSaveShortcut(() => {
    const element = document.getElementById(FORM_ID)
    if (element instanceof HTMLFormElement) element.requestSubmit()
  })

  const askDelete = async () => {
    const ok = await confirm({
      title: t('media.card.deleteTitle'),
      description: t('media.card.deleteText'),
      confirmLabel: t('media.card.delete'),
      danger: true,
    })
    if (ok) remove.mutate()
  }

  const reloadFresh = async () => {
    setConflict(null)
    const fresh = await queryClient.fetchQuery({ ...mediaItemQuery(item.id), staleTime: 0 })
    refresh(fresh)
    form.reset(formValues(fresh, schema))
  }

  return (
    <>
      <SchemaForm
        id={FORM_ID}
        schema={schema}
        form={form}
        formErrors={formErrors}
        onSubmit={(values) => save.mutate(values)}
      >
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-between">
          <Button
            variant="ghost"
            className="text-danger"
            icon={<Trash2 size={16} aria-hidden="true" />}
            loading={remove.isPending}
            onClick={() => void askDelete()}
          >
            {t('media.card.delete')}
          </Button>
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
        onReload={() => void reloadFresh()}
        onKeep={() => setConflict(null)}
      />
      <InUseDialog usages={inUse} onClose={() => setInUse(null)} />
    </>
  )
}

/** Details of one file: preview, facts, editable caption/folder/tags, usages, delete. */
export function MediaCard({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const t = useT()
  const toast = useToast()
  const { data: item, isPending } = useQuery(mediaItemQuery(id))
  const { data: entityTypes } = useQuery(entityTypesQuery())
  const { data: usages } = useQuery(mediaUsagesQuery(id))
  const schema = entityTypes?.find((e) => e.type === 'media')?.schema as JsonSchema | undefined

  if (isPending || !item) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.url)
      toast.success(t('media.card.copied'))
    } catch {
      toast.error(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <Preview item={item} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Copy size={16} aria-hidden="true" />} onClick={() => void copy()}>
          {t('media.card.copyUrl')}
        </Button>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-touch items-center gap-1.5 rounded px-3 text-sm hover:bg-sunken md:min-h-8"
        >
          <ExternalLink size={16} aria-hidden="true" />
          {t('media.card.openOriginal')}
        </a>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-mute">{t('media.card.type')}</dt>
        <dd className="font-mono text-xs leading-5">{item.mime_type}</dd>
        <dt className="text-mute">{t('media.card.size')}</dt>
        <dd>{formatBytes(item.size_bytes)}</dd>
        <dt className="text-mute">{t('media.card.dimensions')}</dt>
        <dd>{item.width ? `${item.width} × ${item.height}` : t('media.card.zeroSize')}</dd>
        <dt className="text-mute">{t('media.card.uploaded')}</dt>
        <dd>{formatDate(item.created_at)}</dd>
      </dl>
      {schema ? (
        <EditForm key={item.version} item={item} schema={schema} onDeleted={onDeleted} />
      ) : (
        <Skeleton className="h-40" />
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm">{t('media.card.usages')}</h3>
        {usages === undefined ? (
          <Skeleton className="h-6" />
        ) : usages.length === 0 ? (
          <p className="text-sm text-mute">{t('media.card.noUsages')}</p>
        ) : (
          <UsageList usages={usages} />
        )}
      </section>
      <p className="sr-only">{displayName(item)}</p>
    </div>
  )
}
