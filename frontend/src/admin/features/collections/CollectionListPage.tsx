import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { GripVertical, MoreVertical, Pencil, Plus, Search, SearchX, Trash2 } from 'lucide-react'
import { useDeferredValue, useId, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import {
  collectionApi,
  collectionKey,
  collectionListQuery,
  type CollectionItem,
  type FilterValues,
  type ListQuery,
  type Paginated,
} from '../../api/collections'
import { AdminApiError, ErrorCode } from '../../api/errors'
import type { Usage } from '../../api/media'
import { lookupQuery, metaOptions, metaQuery } from '../../api/queries'
import { CardThumb } from '../../forms/EntityPicker'
import { InUseDialog } from '../../forms/conflicts'
import { usagesFromDetails } from '../../forms/usage'
import { useT } from '../../i18n'
import { COLLECTIONS } from '../../layout/nav'
import { Button, ButtonLink } from '../../ui/Button'
import { useConfirm } from '../../ui/confirm-context'
import { EmptyState, Skeleton } from '../../ui/feedback'
import { IconButton } from '../../ui/IconButton'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../ui/Menu'
import { controlClass } from '../../ui/styles'
import { Switch } from '../../ui/Switch'
import { useToast } from '../../ui/toast-context'
import { AdminNotFound, PageTitle } from '../Placeholder'
import { collectionConfig, itemTitle, type CollectionConfig, type FilterDef } from './config'

type ListData = InfiniteData<Paginated<CollectionItem>>

/** Search text, sort and filters live in the address: back from a record keeps them. */
function useListQuery(config: CollectionConfig) {
  const [params, setParams] = useSearchParams()
  const filters: FilterValues = {}
  for (const filter of config.filters) {
    const raw = params.get(filter.name)
    if (raw === null) continue
    filters[filter.name] = filter.type === 'boolean' ? raw === 'true' : raw
  }
  const query: ListQuery = { q: params.get('q') ?? '', sort: params.get('sort'), filters }
  const set = (name: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null || value === '') next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )
  const reset = () => setParams(new URLSearchParams(), { replace: true })
  return { query, set, reset, raw: params }
}

function FilterSelect({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef
  value: string
  onChange: (value: string | null) => void
}) {
  const t = useT()
  const id = useId()
  const { data: meta } = useQuery(metaQuery())
  const { data: cards } = useQuery({
    ...lookupQuery(filter.type === 'lookup' ? filter.kind : 'division', ''),
    enabled: filter.type === 'lookup',
  })
  const options =
    filter.type === 'boolean'
      ? [
          { value: 'true', label: t(filter.yes) },
          { value: 'false', label: t(filter.no) },
        ]
      : filter.type === 'meta'
        ? metaOptions(meta, filter.list)
        : (cards ?? []).map((c) => ({ value: c.id, label: c.title }))
  return (
    <div className="flex min-w-40 flex-1 flex-col gap-1 md:max-w-56 md:flex-none">
      <label htmlFor={id} className="text-xs text-mute">
        {t(filter.label)}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className={controlClass}
      >
        <option value="">{t('collection.filters.all')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface RowProps {
  config: CollectionConfig
  item: CollectionItem
  draggable: boolean
  columns: string
  onToggle: (item: CollectionItem, published: boolean) => void
  onDelete: (item: CollectionItem) => void
  toggling: boolean
}

function ItemRow({ config, item, draggable, columns, onToggle, onDelete, toggling }: RowProps) {
  const t = useT()
  const navigate = useNavigate()
  const { data: meta } = useQuery(metaQuery())
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !draggable })
  const title = itemTitle(config, item)
  const subtitle = config.subtitle?.(item)
  const href = `/admin/collections/${config.slug}/${item.id}`
  const switchId = useId()
  const style: CSSProperties & { '--cols': string } = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    '--cols': columns,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-panel p-2 md:grid md:grid-cols-[var(--cols)] md:gap-4',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      {draggable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${t('form.array.drag')}: ${title}`}
          className="inline-flex min-h-touch min-w-touch shrink-0 cursor-grab touch-none items-center justify-center rounded text-mute hover:bg-sunken md:min-h-8 md:min-w-8"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      )}
      <Link
        to={href}
        className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded px-1 hover:bg-sunken"
      >
        {config.thumb && <CardThumb card={config.thumb(item) ?? undefined} className="w-10" />}
        <span className="min-w-0">
          <span className="block truncate font-medium">{title}</span>
          {subtitle && <span className="block truncate text-xs text-mute">{subtitle}</span>}
        </span>
      </Link>
      {config.columns.map((column) => (
        <span
          key={column.label}
          className="flex basis-full items-center gap-2 text-sm md:basis-auto md:truncate"
        >
          <span className="text-xs text-mute md:sr-only">{t(column.label)}:</span>
          {column.render(item, meta)}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <Switch
          id={switchId}
          checked={item.is_published}
          disabled={toggling}
          onCheckedChange={(checked) => onToggle(item, checked)}
        />
        <label htmlFor={switchId} className="text-sm md:sr-only">
          {t('collection.onSite')}
          <span className="sr-only">: {title}</span>
        </label>
      </span>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            label={t('collection.actions', { name: title })}
            icon={<MoreVertical size={16} aria-hidden="true" />}
            className="ml-auto md:ml-0"
          />
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={<Pencil size={16} />} onSelect={() => navigate(href)}>
            {t('collection.edit')}
          </MenuItem>
          <MenuItem icon={<Trash2 size={16} />} onSelect={() => onDelete(item)} danger>
            {t('common.delete')}
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  )
}

function CollectionList({ config }: { config: CollectionConfig }) {
  const t = useT()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { query, set, reset, raw } = useListQuery(config)
  const [search, setSearch] = useState(query.q)
  const q = useDeferredValue(search.trim())
  const listQuery = { ...query, q }
  const options = collectionListQuery<CollectionItem>(config.slug, listQuery)
  const list = useInfiniteQuery(options)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const total = list.data?.pages[0]?.total ?? 0
  const [inUse, setInUse] = useState<{ usages: Usage[]; text: string } | null>(null)
  const filtered = Boolean(q) || query.sort !== null || Object.keys(query.filters).length > 0
  const draggable = config.reorder !== false && !filtered && !list.hasNextPage
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setItems = (update: (items: CollectionItem[]) => CollectionItem[]) =>
    queryClient.setQueryData<ListData>(options.queryKey, (data) =>
      data
        ? { ...data, pages: data.pages.map((page) => ({ ...page, items: update(page.items) })) }
        : data,
    )

  const refresh = () => queryClient.invalidateQueries({ queryKey: collectionKey(config.slug) })

  const toggle = useMutation({
    mutationFn: ({ item, published }: { item: CollectionItem; published: boolean }) =>
      collectionApi.update<CollectionItem>(config.slug, item.id, {
        version: item.version,
        is_published: published,
      }),
    onSuccess: (saved) => {
      setItems((rows) => rows.map((row) => (row.id === saved.id ? saved : row)))
      void refresh()
      toast.success(saved.is_published ? t('collection.published') : t('collection.unpublished'))
    },
    onError: (error) => {
      if (error instanceof AdminApiError && error.code === ErrorCode.versionConflict) {
        toast.show({ tone: 'info', title: t('collection.changedMeanwhile') })
        void refresh()
      } else toast.error(error)
    },
  })

  const remove = useMutation({
    mutationFn: (item: CollectionItem) => collectionApi.remove(config.slug, item.id, item.version),
    onSuccess: () => {
      void refresh()
      toast.success(t('collection.deleted'))
    },
    onError: (error) => {
      if (error instanceof AdminApiError && error.code === ErrorCode.inUse) {
        setInUse({ usages: usagesFromDetails(error.details), text: error.message })
      } else if (error instanceof AdminApiError && error.code === ErrorCode.versionConflict) {
        toast.show({ tone: 'info', title: t('collection.changedMeanwhile') })
        void refresh()
      } else toast.error(error)
    },
  })

  const askDelete = async (item: CollectionItem) => {
    const ok = await confirm({
      title: t('collection.deleteTitle', { name: itemTitle(config, item) }),
      description: t('collection.deleteText'),
      confirmLabel: t('common.delete'),
      danger: true,
    })
    if (ok) remove.mutate(item)
  }

  const reorder = useMutation({
    mutationFn: (ids: string[]) => collectionApi.reorder(config.slug, ids),
    onMutate: (ids) => {
      const before = queryClient.getQueryData<ListData>(options.queryKey)
      const byId = new Map(items.map((item) => [item.id, item]))
      setItems(() => ids.flatMap((id) => byId.get(id) ?? []))
      return { before }
    },
    onSuccess: () => toast.success(t('collection.reordered')),
    onError: (error, _ids, context) => {
      if (context?.before) queryClient.setQueryData(options.queryKey, context.before)
      if (error instanceof AdminApiError && error.code === ErrorCode.orderMismatch) {
        toast.show({ tone: 'info', title: t('collection.orderMismatch') })
        void refresh()
      } else toast.error(error)
    },
  })

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || config.reorder === false) return
    const ids = items.map((item) => item.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    const group = config.reorder.group
    const [a, b] = [items[from], items[to]]
    if (group && a && b && group(a) !== group(b)) {
      toast.show({ tone: 'info', title: t(config.reorder.groupHint ?? '') })
      return
    }
    reorder.mutate(arrayMove(ids, from, to))
  }

  // Desktop grid: [drag] title, columns, "on site", menu.
  const columns = [
    draggable ? 'auto' : '',
    'minmax(0,2fr)',
    ...config.columns.map(() => 'minmax(0,1fr)'),
    'auto',
    'auto',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        <PageTitle>{t(`collections.${config.slug}`)}</PageTitle>
        <ButtonLink
          to={`/admin/collections/${config.slug}/new`}
          variant="primary"
          icon={<Plus size={16} aria-hidden="true" />}
        >
          {t(config.newLabel)}
        </ButtonLink>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full md:w-72">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              set('q', e.target.value.trim() || null)
            }}
            placeholder={t('collection.search')}
            aria-label={t('collection.search')}
            className={cn(controlClass, 'pl-9')}
          />
        </div>
        {config.filters.map((filter) => (
          <FilterSelect
            key={filter.name}
            filter={filter}
            value={raw.get(filter.name) ?? ''}
            onChange={(value) => set(filter.name, value)}
          />
        ))}
        {config.sorts.length > 1 && (
          <SortSelect config={config} value={query.sort} onChange={(value) => set('sort', value)} />
        )}
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('')
              reset()
            }}
          >
            {t('collection.resetFilters')}
          </Button>
        )}
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX size={28} aria-hidden="true" />}
            title={t('collection.nothingFound')}
            action={
              <Button
                onClick={() => {
                  setSearch('')
                  reset()
                }}
              >
                {t('collection.resetFilters')}
              </Button>
            }
          />
        ) : (
          <EmptyState
            title={t('collection.empty')}
            action={
              <ButtonLink to={`/admin/collections/${config.slug}/new`} variant="primary">
                {t(config.newLabel)}
              </ButtonLink>
            }
          />
        )
      ) : (
        <>
          <p className="mb-2 text-xs text-mute" aria-live="polite">
            {t('collection.total', { count: total })}
            {config.reorder !== false &&
              (draggable
                ? ` · ${t('collection.reorder.hint')}`
                : ` · ${t('collection.reorder.off')}`)}
          </p>
          <div
            aria-hidden="true"
            style={{ '--cols': columns } as CSSProperties}
            className="hidden px-2 pb-1 text-xs text-mute md:grid md:grid-cols-[var(--cols)] md:gap-4"
          >
            {draggable && <span className="w-8" />}
            <span>{t('collection.columns.title')}</span>
            {config.columns.map((column) => (
              <span key={column.label}>{t(column.label)}</span>
            ))}
            <span>{t('collection.onSite')}</span>
            <span className="w-9" />
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2" aria-label={t(`collections.${config.slug}`)}>
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    config={config}
                    item={item}
                    draggable={draggable}
                    columns={columns}
                    toggling={toggle.isPending && toggle.variables?.item.id === item.id}
                    onToggle={(row, published) => toggle.mutate({ item: row, published })}
                    onDelete={(row) => void askDelete(row)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          {list.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {t('collection.showMore')}
              </Button>
            </div>
          )}
        </>
      )}
      <InUseDialog
        usages={inUse?.usages ?? null}
        onClose={() => setInUse(null)}
        title={t('collection.cannotDelete')}
        text={inUse?.text}
      />
    </>
  )
}

function SortSelect({
  config,
  value,
  onChange,
}: {
  config: CollectionConfig
  value: string | null
  onChange: (value: string | null) => void
}) {
  const t = useT()
  const id = useId()
  return (
    <div className="flex min-w-40 flex-1 flex-col gap-1 md:max-w-56 md:flex-none">
      <label htmlFor={id} className="text-xs text-mute">
        {t('collection.sort.label')}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={controlClass}
      >
        {config.sorts.map((sort) => (
          <option key={sort.value ?? ''} value={sort.value ?? ''}>
            {t(sort.label)}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Any collection: `/admin/collections/<collection>`. */
export function CollectionListPage() {
  const { collection } = useParams()
  const config = collectionConfig(collection)
  if (!config || !COLLECTIONS.some((c) => c.slug === config.slug)) return <AdminNotFound />
  // Separate state per collection when switching between them in the menu.
  return <CollectionList key={config.slug} config={config} />
}
