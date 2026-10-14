import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Check, Grid2x2, ImageOff, List, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { cn } from '@/lib/cn'
import { acceptAttribute, mediaKindOf, type MediaItem, type MediaKind } from '../../api/media'
import { mediaFoldersQuery, mediaListQuery, metaQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { BREAKPOINTS, useMediaQuery } from '../../layout/useMediaQuery'
import { Button } from '../../ui/Button'
import { EmptyState, Skeleton } from '../../ui/feedback'
import { controlClass } from '../../ui/styles'
import { Dropzone } from './Dropzone'
import { displayName, formatBytes, formatDate } from './format'
import { MediaThumb } from './MediaThumb'
import { UploadPanel } from './UploadPanel'
import { useUploads } from './useUploads'

type View = 'grid' | 'list'
const VIEW_KEY = 'ms-admin-media-view'
const SORTS = ['-created_at', 'created_at', 'original_filename', '-size_bytes'] as const

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function saveView(view: View) {
  try {
    window.localStorage.setItem(VIEW_KEY, view)
  } catch {
    // A per-browser convenience; fine to lose.
  }
}

interface MediaBrowserProps {
  /** `library`: items open their card. `pick`: items are chosen for a field. */
  mode: 'library' | 'pick'
  /** Kinds that fit the field (pick mode); the kind filter offers only these. */
  accept?: readonly MediaKind[]
  many?: boolean
  selectedIds?: readonly string[]
  onActivate: (item: MediaItem) => void
  /** Called with each finished upload (pick mode selects it). */
  onUploaded?: (item: MediaItem) => void
}

export function MediaBrowser({
  mode,
  accept,
  many = false,
  selectedIds = [],
  onActivate,
  onUploaded,
}: MediaBrowserProps) {
  const t = useT()
  const wide = useMediaQuery(BREAKPOINTS.md)
  const { data: meta } = useQuery(metaQuery())
  const { data: folders } = useQuery(mediaFoldersQuery())
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())
  const kindChoices = (meta?.media_kinds ?? []).filter(
    (k) => !accept || accept.includes(k.value as MediaKind),
  )
  // A field that takes several kinds (pictures and SVG) starts with the first one; the API
  // filters by one kind at a time.
  const [kind, setKind] = useState<MediaKind | null>(accept?.[0] ?? null)
  const [folder, setFolder] = useState<string | null>(null)
  const [sort, setSort] = useState<(typeof SORTS)[number]>('-created_at')
  const [view, setView] = useState<View>(readView)
  const uploads = useUploads({ folder, kinds: accept, onUploaded })

  const list = useInfiniteQuery(mediaListQuery({ q, kind, folder, sort }))
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const total = list.data?.pages[0]?.total ?? 0
  const filtered = Boolean(q || folder || (kind && !accept))
  const selected = new Set(selectedIds)
  // The picker lives in a dialog narrower than the page: fewer columns there.
  const gridColumns =
    mode === 'pick'
      ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5'
      : 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6'

  const changeView = (next: View) => {
    setView(next)
    saveView(next)
  }

  const itemLabel = (item: MediaItem) => {
    const name = displayName(item) || t('media.untitled')
    return mode === 'pick' ? t('media.picker.select', { name }) : t('media.card.open', { name })
  }

  return (
    <Dropzone accept={acceptAttribute(meta, accept)} onFiles={uploads.add}>
      <div className="flex flex-col gap-3">
        {meta && (
          <p className="text-xs text-mute">
            {t('media.limits', { image: meta.media.image_mb, video: meta.media.video_mb })}
          </p>
        )}
        <UploadPanel
          items={uploads.items}
          onRetry={uploads.retry}
          onDismiss={uploads.dismiss}
          onClearDone={uploads.clearDone}
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="relative min-w-0 flex-[1_1_16rem]">
            <span className="sr-only">{t('media.search')}</span>
            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"
            />
            <input
              type="search"
              value={search}
              placeholder={t('media.search')}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(controlClass, 'pl-9')}
            />
          </label>
          {kindChoices.length > 1 || !accept ? (
            <label className="flex-[1_1_9rem]">
              <span className="sr-only">{t('media.kind')}</span>
              <select
                value={kind ?? ''}
                onChange={(e) => setKind((e.target.value || null) as MediaKind | null)}
                className={controlClass}
              >
                {!accept && <option value="">{t('media.allKinds')}</option>}
                {kindChoices.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex-[1_1_9rem]">
            <span className="sr-only">{t('media.folder')}</span>
            <select
              value={folder ?? ''}
              onChange={(e) => setFolder(e.target.value || null)}
              className={controlClass}
            >
              <option value="">{t('media.allFolders')}</option>
              {(folders ?? [])
                .filter((f) => f.folder)
                .map((f) => (
                  <option key={f.folder} value={f.folder ?? ''}>
                    {f.folder} ({f.count})
                  </option>
                ))}
            </select>
          </label>
          <label className="flex-[1_1_10rem]">
            <span className="sr-only">{t('media.sort')}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
              className={controlClass}
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`media.sorts.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <div
            role="group"
            aria-label={t('media.view.label')}
            className="flex rounded border border-line-strong bg-panel p-0.5"
          >
            {(['grid', 'list'] as const).map((v) => {
              const Icon = v === 'grid' ? Grid2x2 : List
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  aria-label={t(`media.view.${v}`)}
                  title={t(`media.view.${v}`)}
                  onClick={() => changeView(v)}
                  className={cn(
                    'inline-flex min-h-touch min-w-touch items-center justify-center rounded md:min-h-8 md:min-w-8',
                    view === v ? 'bg-fg text-canvas' : 'text-mute hover:text-fg',
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>

        {list.isPending ? (
          <div className={cn('grid gap-3', gridColumns)}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : list.isError ? (
          <EmptyState
            icon={<ImageOff size={28} aria-hidden="true" />}
            title={t('errors.loadFailed')}
            action={<Button onClick={() => void list.refetch()}>{t('common.retry')}</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ImageOff size={28} aria-hidden="true" />}
            title={filtered ? t('media.emptyFiltered') : t('media.empty')}
          />
        ) : view === 'grid' || !wide ? (
          <ul className={cn('grid gap-3', view === 'grid' ? gridColumns : 'grid-cols-1')}>
            {items.map((item) => {
              const isSelected = selected.has(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onActivate(item)}
                    aria-label={itemLabel(item)}
                    aria-pressed={mode === 'pick' && many ? isSelected : undefined}
                    className={cn(
                      'group relative flex w-full gap-2 rounded-lg border bg-panel p-1.5 text-left',
                      view === 'grid' ? 'flex-col' : 'items-center',
                      isSelected
                        ? 'border-accent-ink ring-2 ring-accent'
                        : 'border-line hover:border-line-strong',
                    )}
                  >
                    <MediaThumb
                      item={item}
                      className={view === 'list' ? 'w-14 shrink-0' : undefined}
                      width={view === 'list' ? 120 : 480}
                    />
                    <span className="flex min-w-0 flex-col px-0.5">
                      <span className="truncate text-sm">
                        {displayName(item) || t('media.untitled')}
                      </span>
                      <span className="truncate font-mono text-xs text-mute">
                        {item.width ? `${item.width}×${item.height} · ` : ''}
                        {formatBytes(item.size_bytes)}
                      </span>
                    </span>
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
                        <Check size={14} aria-hidden="true" />
                        <span className="sr-only">{t('media.picker.selected')}</span>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-mute">
                <th className="py-2 pr-2 font-medium">{t('media.columns.name')}</th>
                <th className="px-2 font-medium">{t('media.columns.type')}</th>
                <th className="px-2 font-medium">{t('media.columns.dimensions')}</th>
                <th className="px-2 font-medium">{t('media.columns.size')}</th>
                <th className="px-2 font-medium">{t('media.columns.folder')}</th>
                <th className="pl-2 font-medium">{t('media.columns.date')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={cn('border-b border-line', selected.has(item.id) && 'bg-sunken')}
                >
                  <td className="py-1.5 pr-2">
                    <button
                      type="button"
                      onClick={() => onActivate(item)}
                      aria-label={itemLabel(item)}
                      aria-pressed={mode === 'pick' && many ? selected.has(item.id) : undefined}
                      className="flex min-h-9 items-center gap-2 text-left hover:underline"
                    >
                      <MediaThumb item={item} className="w-9 shrink-0" width={120} />
                      <span className="truncate">{displayName(item) || t('media.untitled')}</span>
                    </button>
                  </td>
                  <td className="px-2 font-mono text-xs">
                    {kindChoices.find((k) => k.value === mediaKindOf(item.mime_type))?.label ??
                      item.mime_type}
                  </td>
                  <td className="px-2 font-mono text-xs">
                    {item.width ? `${item.width}×${item.height}` : '—'}
                  </td>
                  <td className="px-2 font-mono text-xs">{formatBytes(item.size_bytes)}</td>
                  <td className="px-2">{item.folder ?? '—'}</td>
                  <td className="pl-2 text-xs text-mute">{formatDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {items.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="text-xs text-mute">{t('media.shown', { shown: items.length, total })}</p>
            {list.hasNextPage && (
              <Button loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {t('media.more')}
              </Button>
            )}
          </div>
        )}
      </div>
    </Dropzone>
  )
}
