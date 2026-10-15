import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, MoreVertical, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  collectionApi,
  collectionItemQuery,
  collectionKey,
  type CollectionItem,
} from '../../api/collections'
import { AdminApiError, ErrorCode } from '../../api/errors'
import type { Usage } from '../../api/media'
import { entityTypesQuery } from '../../api/queries'
import { InUseDialog, VersionConflictDialog } from '../../forms/conflicts'
import { useSaveShortcut, useUnsavedGuard } from '../../forms/guards'
import { applyServerErrors } from '../../forms/schema/errors'
import { SchemaForm } from '../../forms/schema/SchemaForm'
import type { JsonSchema } from '../../forms/schema/types'
import { formToStored, type Values } from '../../forms/schema/values'
import { useSchemaForm } from '../../forms/schema/useSchemaForm'
import { usagesFromDetails } from '../../forms/usage'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { useConfirm } from '../../ui/confirm-context'
import { Badge, EmptyState, Skeleton } from '../../ui/feedback'
import { IconButton } from '../../ui/IconButton'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../ui/Menu'
import { useToast } from '../../ui/toast-context'
import { AdminNotFound } from '../Placeholder'
import { collectionConfig, itemTitle, type CollectionConfig } from './config'
import { usePrefill } from './usePrefill'
import {
  itemValues,
  newItemValues,
  rememberItemCards,
  sameValue,
  separateIssues,
  splitValues,
} from './itemForm'

const FORM_ID = 'collection-item-form'

interface EditorProps {
  config: CollectionConfig
  schema: JsonSchema
  /** null: a new record. */
  item: CollectionItem | null
}

/** The record is saved, the request saving its separate field (the gallery) failed. */
class PartlySaved extends Error {
  constructor(
    readonly reason: unknown,
    readonly saved: CollectionItem,
  ) {
    super('partly saved')
  }
}

function ItemEditor({ config, schema, item: loaded }: EditorProps) {
  const t = useT()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // The version being edited: the loaded record, then each saved one. Cards of what it
  // references are cached before the fields mount, so they show names without a request.
  const [item, setItem] = useState(() => {
    if (loaded) rememberItemCards(queryClient, loaded)
    return loaded
  })
  // Values of the first render; later versions reset the form explicitly.
  const [initial] = useState(() =>
    loaded ? itemValues(config, schema, loaded) : newItemValues(schema),
  )
  const form = useSchemaForm(schema, initial)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [conflict, setConflict] = useState<Values | null>(null)
  const [inUse, setInUse] = useState<{ usages: Usage[]; title: string; text: string } | null>(null)
  // Where to go once nothing can be lost (after creating or deleting).
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const dirty = form.formState.isDirty
  const listPath = `/admin/collections/${config.slug}`

  useUnsavedGuard(dirty && leaveTo === null)
  usePrefill(config, form)
  useSaveShortcut(() => {
    const element = document.getElementById(FORM_ID)
    if (element instanceof HTMLFormElement) element.requestSubmit()
  })
  useEffect(() => {
    if (leaveTo !== null) navigate(leaveTo, { replace: true })
  }, [leaveTo, navigate])

  const adopt = useCallback(
    (record: CollectionItem) => {
      rememberItemCards(queryClient, record)
      setItem(record)
      form.reset(itemValues(config, schema, record))
    },
    [queryClient, form, config, schema],
  )

  // A newer version arrived (someone else saved): shown at once unless there are edits;
  // with edits, saving stops with the version conflict dialog instead of losing them.
  useEffect(() => {
    if (loaded && item && loaded.version > item.version && !form.formState.isDirty) adopt(loaded)
  }, [loaded, item, form, adopt])

  const showError = (error: unknown, values: Values, deleting = false, fromSeparate = false) => {
    if (!(error instanceof AdminApiError)) return toast.error(error)
    if (error.code === ErrorCode.versionConflict) setConflict(values)
    else if (error.code === ErrorCode.inUse) {
      setInUse({
        usages: usagesFromDetails(error.details),
        title: deleting ? t('collection.cannotDelete') : t('collection.cannotSave'),
        text: error.message,
      })
    } else if (error.fieldIssues.length > 0) {
      const issues = fromSeparate ? separateIssues(config, error.fieldIssues) : error.fieldIssues
      setFormErrors(applyServerErrors(form, schema, issues))
    } else if (error.code === ErrorCode.alreadyExists && 'slug' in (schema.properties ?? {})) {
      form.setError('slug', { type: 'server', message: error.message }, { shouldFocus: true })
    } else toast.error(error)
  }

  const cache = (saved: CollectionItem) => {
    queryClient.setQueryData(collectionItemQuery(config.slug, saved.id).queryKey, saved)
    void queryClient.invalidateQueries({ queryKey: [...collectionKey(config.slug), 'list'] })
  }

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const { own, separate } = splitValues(config, values)
      const before = splitValues(config, formToStored(schema, form.formState.defaultValues ?? {}))
      let saved = item
      if (!saved) saved = await collectionApi.create<CollectionItem>(config.slug, own)
      else if (!sameValue(own, before.own)) {
        saved = await collectionApi.update<CollectionItem>(config.slug, saved.id, {
          ...own,
          version: saved.version,
        })
      }
      if (config.separate && !sameValue(separate, before.separate)) {
        try {
          saved = await config.separate.save(saved, separate)
        } catch (error) {
          throw new PartlySaved(error, saved)
        }
      }
      return saved
    },
    onSuccess: (saved) => {
      cache(saved)
      setFormErrors([])
      toast.success(item ? t('collection.saved') : t('collection.created'))
      if (item) adopt(saved)
      else setLeaveTo(`${listPath}/${saved.id}`)
    },
    onError: (failure, values) => {
      if (!(failure instanceof PartlySaved)) return showError(failure, values)
      // The record itself is saved; the form keeps the unsaved field and shows its problem.
      cache(failure.saved)
      if (!item) {
        toast.error(failure.reason)
        setLeaveTo(`${listPath}/${failure.saved.id}`)
        return
      }
      setItem(failure.saved)
      showError(failure.reason, values, false, true)
    },
  })

  const remove = useMutation({
    mutationFn: (record: CollectionItem) =>
      collectionApi.remove(config.slug, record.id, record.version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionKey(config.slug) })
      toast.success(t('collection.deleted'))
      setLeaveTo(listPath)
    },
    onError: (error) => showError(error, form.getValues(), true),
  })

  const askDelete = async () => {
    if (!item) return
    const ok = await confirm({
      title: t('collection.deleteTitle', { name: itemTitle(config, item) }),
      description: t('collection.deleteText'),
      confirmLabel: t('common.delete'),
      danger: true,
    })
    if (ok) remove.mutate(item)
  }

  const reloadFresh = async () => {
    setConflict(null)
    if (!item) return
    const fresh = await queryClient.fetchQuery({
      ...collectionItemQuery<CollectionItem>(config.slug, item.id),
      staleTime: 0,
    })
    adopt(fresh)
  }

  const siteHref = item ? config.siteHref?.(item) : null
  const title = item ? itemTitle(config, item) : t(config.newLabel)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Link
          to={listPath}
          className="inline-flex min-h-touch items-center gap-1 self-start text-sm text-mute hover:text-fg md:min-h-8"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t(`collections.${config.slug}`)}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="break-words text-xl md:text-2xl">{title}</h1>
            {item && (
              <span>
                {item.is_published ? (
                  <Badge tone="success">{t('collection.onSite')}</Badge>
                ) : (
                  <Badge>{t('collection.hidden')}</Badge>
                )}
              </span>
            )}
          </div>
          {item && (
            <Menu>
              <MenuTrigger asChild>
                <IconButton
                  label={t('collection.more')}
                  icon={<MoreVertical size={16} aria-hidden="true" />}
                />
              </MenuTrigger>
              <MenuContent>
                {siteHref && (
                  <MenuItem
                    icon={<ExternalLink size={16} />}
                    onSelect={() => window.open(siteHref, '_blank', 'noopener')}
                  >
                    {t('collection.openOnSite')}
                  </MenuItem>
                )}
                <MenuItem icon={<Trash2 size={16} />} onSelect={() => void askDelete()} danger>
                  {t('common.delete')}
                </MenuItem>
              </MenuContent>
            </Menu>
          )}
        </div>
      </div>

      <SchemaForm
        id={FORM_ID}
        schema={schema}
        form={form}
        formErrors={formErrors}
        onSubmit={(values) => save.mutate(values)}
      >
        <div className="sticky bottom-0 z-[1] -mx-4 flex flex-col-reverse gap-2 border-t border-line bg-panel/95 px-4 py-3 backdrop-blur md:mx-0 md:flex-row md:justify-end md:rounded-b-lg">
          <Button onClick={() => navigate(listPath)}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            variant="primary"
            loading={save.isPending}
            disabled={item !== null && !dirty}
          >
            {item ? t('common.save') : t('collection.create')}
          </Button>
        </div>
      </SchemaForm>
      <VersionConflictDialog
        open={conflict !== null}
        edits={conflict}
        onReload={() => void reloadFresh()}
        onKeep={() => setConflict(null)}
      />
      <InUseDialog
        usages={inUse?.usages ?? null}
        onClose={() => setInUse(null)}
        title={inUse?.title}
        text={inUse?.text}
      />
    </div>
  )
}

function useEntitySchema(config: CollectionConfig | null): JsonSchema | undefined {
  const { data: entities } = useQuery(entityTypesQuery())
  return entities?.find((e) => e.type === config?.entity)?.schema as JsonSchema | undefined
}

function ExistingItem({
  config,
  schema,
  id,
}: {
  config: CollectionConfig
  schema: JsonSchema
  id: string
}) {
  const t = useT()
  const {
    data: item,
    isPending,
    error,
  } = useQuery(collectionItemQuery<CollectionItem>(config.slug, id))
  if (isPending) return <Skeleton className="mx-auto h-96 max-w-3xl" />
  if (error instanceof AdminApiError && error.status === 404) return <AdminNotFound />
  if (!item) return <EmptyState title={t('errors.loadFailed')} />
  return <ItemEditor key={item.id} config={config} schema={schema} item={item} />
}

/** One record of a collection: `/admin/collections/<collection>/<id>` or `…/new`. */
export function CollectionItemPage() {
  const { collection, itemId = 'new' } = useParams()
  const config = collectionConfig(collection)
  const schema = useEntitySchema(config)
  if (!config) return <AdminNotFound />
  if (!schema) return <Skeleton className="mx-auto h-96 max-w-3xl" />
  if (itemId === 'new') return <ItemEditor config={config} schema={schema} item={null} />
  return <ExistingItem config={config} schema={schema} id={itemId} />
}
