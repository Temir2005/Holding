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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, GripVertical, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { AdminApiError } from '../../api/errors'
import { pagesListQuery, pageTitle, type PageSummary } from '../../api/pages'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { EmptyState, Skeleton } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'
import { formatDate } from '../media/format'
import { PageTitle } from '../Placeholder'
import { NewPageDialog } from './NewPageDialog'
import { PageStatusBadge } from './PageStatusBadge'

function PageRow({ page }: { page: PageSummary }) {
  const t = useT()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id })
  const title = pageTitle(page)
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={`flex items-center gap-2 rounded-lg border border-line bg-panel p-2 ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
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
      <Link
        to={`/admin/pages/${page.id}`}
        className="flex min-h-touch min-w-0 flex-1 flex-col justify-center gap-1 rounded px-1 py-1 hover:bg-sunken md:flex-row md:items-center md:gap-4"
      >
        <span className="min-w-0 md:w-1/3">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate font-mono text-xs text-mute">/{page.slug}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2 md:flex-1">
          <PageStatusBadge page={page} />
          <span className="text-xs text-mute">
            {page.published_at
              ? t('pages.publishedAt', { date: formatDate(page.published_at) })
              : t('pages.neverPublished')}
          </span>
        </span>
        <span className="text-xs text-mute">
          {t('pages.blocksCount', { count: page.sections_count })}
        </span>
      </Link>
    </li>
  )
}

export function PagesListPage() {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  const list = useQuery(pagesListQuery())
  const [creating, setCreating] = useState(false)
  const pages = list.data?.items ?? []
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.put('/api/v1/admin/pages/order', { body: { ids } }),
    onMutate: (ids) => {
      const key = pagesListQuery().queryKey
      const before = queryClient.getQueryData(key)
      if (before) {
        const byId = new Map(before.items.map((p) => [p.id, p]))
        queryClient.setQueryData(key, { ...before, items: ids.flatMap((id) => byId.get(id) ?? []) })
      }
      return { before }
    },
    onSuccess: () => toast.success(t('pages.reordered')),
    onError: (error, _ids, context) => {
      if (context?.before) queryClient.setQueryData(pagesListQuery().queryKey, context.before)
      if (error instanceof AdminApiError && error.code === 'ORDER_MISMATCH') {
        toast.show({ tone: 'info', title: t('pages.orderMismatch') })
        void list.refetch()
      } else toast.error(error)
    },
  })

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = pages.map((p) => p.id)
    reorder.mutate(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        <PageTitle>{t('pages.title')}</PageTitle>
        <Button
          variant="primary"
          icon={<Plus size={16} aria-hidden="true" />}
          onClick={() => setCreating(true)}
        >
          {t('pages.new')}
        </Button>
      </div>
      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} aria-hidden="true" />}
          title={t('pages.empty')}
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              {t('pages.new')}
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {pages.map((page) => (
                <PageRow key={page.id} page={page} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <NewPageDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}
