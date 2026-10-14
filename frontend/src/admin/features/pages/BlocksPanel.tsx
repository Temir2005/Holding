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
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode } from '../../api/errors'
import { blockTitle, pageDetailQuery, type PageDetail, type SectionRead } from '../../api/pages'
import { sectionTypesQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { useConfirm } from '../../ui/confirm-context'
import { Badge, EmptyState } from '../../ui/feedback'
import { IconButton } from '../../ui/IconButton'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '../../ui/Menu'
import { useToast } from '../../ui/toast-context'

interface RowProps {
  section: SectionRead
  index: number
  typeLabel: string
  onEdit: () => void
  onAddAfter: () => void
  onToggle: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function BlockRow({
  section,
  index,
  typeLabel,
  onEdit,
  onAddAfter,
  onToggle,
  onDuplicate,
  onDelete,
}: RowProps) {
  const t = useT()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })
  const title = blockTitle(section.data)
  const name = title || typeLabel
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={cn(
        'flex items-center gap-1 rounded-lg border border-line bg-panel p-1.5',
        isDragging && 'relative z-10 shadow-lg',
        !section.is_visible && 'bg-sunken',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${t('form.array.drag')}: ${name}`}
        className="inline-flex min-h-touch min-w-touch shrink-0 cursor-grab touch-none items-center justify-center rounded text-mute hover:bg-sunken md:min-h-8 md:min-w-8"
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded px-1 text-left hover:bg-sunken md:min-h-11"
      >
        <span className="w-5 shrink-0 text-right font-mono text-xs text-mute">{index + 1}</span>
        <span className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-mute">
              {typeLabel}
            </span>
            {!section.is_visible && <Badge>{t('blocks.hidden')}</Badge>}
            {section.anchor && (
              <span className="font-mono text-xs text-mute">#{section.anchor}</span>
            )}
          </span>
          <span className={cn('truncate text-sm', !title && 'text-mute')}>
            {title || t('blocks.untitled')}
          </span>
        </span>
      </button>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            label={t('blocks.actions', { name })}
            icon={<MoreVertical size={16} aria-hidden="true" />}
          />
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={<Pencil size={16} />} onSelect={onEdit}>
            {t('blocks.edit')}
          </MenuItem>
          <MenuItem
            icon={section.is_visible ? <EyeOff size={16} /> : <Eye size={16} />}
            onSelect={onToggle}
          >
            {section.is_visible ? t('blocks.hide') : t('blocks.show')}
          </MenuItem>
          <MenuItem icon={<Copy size={16} />} onSelect={onDuplicate}>
            {t('blocks.duplicate')}
          </MenuItem>
          <MenuItem icon={<Plus size={16} />} onSelect={onAddAfter}>
            {t('blocks.addAfter')}
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Trash2 size={16} />} onSelect={onDelete} danger>
            {t('blocks.delete')}
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  )
}

/** Blocks of the page's draft: order, visibility, copies, deletion; editing opens a panel. */
export function BlocksPanel({
  page,
  onEdit,
  onAdd,
}: {
  page: PageDetail
  onEdit: (section: SectionRead) => void
  /** Opens the type chooser; the block goes to `position` (0-based). */
  onAdd: (position: number) => void
}) {
  const t = useT()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { data: types } = useQuery(sectionTypesQuery())
  const detailKey = pageDetailQuery(page.id).queryKey
  const sections = page.sections
  const labelOf = (type: string) => types?.find((s) => s.type === type)?.label ?? type
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const refresh = () => void queryClient.invalidateQueries({ queryKey: detailKey })
  const onError = (error: Error) => {
    if (
      error instanceof AdminApiError &&
      (error.code === ErrorCode.versionConflict || error.code === ErrorCode.orderMismatch)
    ) {
      toast.show({ tone: 'info', title: error.message })
      refresh()
    } else toast.error(error)
  }

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      api.put('/api/v1/admin/pages/{page_id}/sections/order', {
        path: { page_id: page.id },
        body: { ids },
      }),
    onMutate: (ids) => {
      const before = queryClient.getQueryData(detailKey)
      if (before) {
        const byId = new Map(before.sections.map((s) => [s.id, s]))
        queryClient.setQueryData(detailKey, {
          ...before,
          sections: ids.flatMap((id) => byId.get(id) ?? []),
        })
      }
      return { before }
    },
    onSuccess: () => {
      refresh()
      toast.success(t('blocks.reordered'))
    },
    onError: (error, _ids, context) => {
      if (context?.before) queryClient.setQueryData(detailKey, context.before)
      onError(error)
    },
  })

  const toggle = useMutation({
    mutationFn: (section: SectionRead) =>
      api.patch('/api/v1/admin/sections/{section_id}', {
        path: { section_id: section.id },
        body: { version: section.version, is_visible: !section.is_visible },
      }),
    onSuccess: refresh,
    onError,
  })

  const duplicate = useMutation({
    mutationFn: (section: SectionRead) =>
      api.post('/api/v1/admin/sections/{section_id}/duplicate', {
        path: { section_id: section.id },
      }),
    onSuccess: () => {
      refresh()
      toast.success(t('blocks.duplicated'))
    },
    onError,
  })

  const remove = useMutation({
    mutationFn: (section: SectionRead) =>
      api.delete('/api/v1/admin/sections/{section_id}', {
        path: { section_id: section.id },
        query: { version: section.version },
      }),
    onSuccess: () => {
      refresh()
      toast.success(t('blocks.deleted'))
    },
    onError,
  })

  const askDelete = async (section: SectionRead) => {
    const name = blockTitle(section.data) || labelOf(section.type)
    if (
      await confirm({
        title: t('blocks.deleteTitle', { name }),
        description: t('blocks.deleteText'),
        confirmLabel: t('blocks.delete'),
        danger: true,
      })
    ) {
      remove.mutate(section)
    }
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = sections.map((s) => s.id)
    reorder.mutate(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <div className="flex flex-col gap-3">
      {sections.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate size={28} aria-hidden="true" />}
          title={t('blocks.empty')}
          action={
            <Button
              variant="primary"
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => onAdd(0)}
            >
              {t('blocks.add')}
            </Button>
          }
        />
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col gap-1.5">
                {sections.map((section, index) => (
                  <BlockRow
                    key={section.id}
                    section={section}
                    index={index}
                    typeLabel={labelOf(section.type)}
                    onEdit={() => onEdit(section)}
                    onAddAfter={() => onAdd(index + 1)}
                    onToggle={() => toggle.mutate(section)}
                    onDuplicate={() => duplicate.mutate(section)}
                    onDelete={() => void askDelete(section)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          <Button
            icon={<Plus size={16} aria-hidden="true" />}
            className="self-start"
            onClick={() => onAdd(sections.length)}
          >
            {t('blocks.add')}
          </Button>
        </>
      )}
    </div>
  )
}
