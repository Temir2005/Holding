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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import { ImageOff, Plus, Replace, X } from 'lucide-react'
import { useState } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import type { MediaItem, MediaKind } from '../../../api/media'
import type { RefCard } from '../../../api/queries'
import { rememberCards, useRefCards } from '../../../api/refCards'
import { MediaPicker } from '../../../features/media/MediaPicker'
import { useT } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { IconButton } from '../../../ui/IconButton'
import type { WidgetProps } from '../registry'
import { useFieldError } from '../useFieldError'

/** A card for a just-picked file, so the field shows it without another request. */
function toCard(item: MediaItem): RefCard {
  const smallest = [...item.variants].sort((a, b) => a.width - b.width)[0]
  return {
    id: item.id,
    kind: 'media',
    title: item.original_filename ?? item.url.split('/').pop() ?? '',
    subtitle: item.width ? `${item.width}×${item.height}` : item.mime_type,
    thumb_url: item.mime_type.startsWith('image/') ? (smallest?.url ?? item.url) : null,
  }
}

function Thumb({ card, className }: { card: RefCard | undefined; className?: string }) {
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center overflow-hidden rounded bg-sunken',
        className,
      )}
    >
      {card?.thumb_url ? (
        <img src={card.thumb_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageOff size={20} aria-hidden="true" className="text-mute" />
      )}
    </div>
  )
}

function SortableTile({
  id,
  card,
  onRemove,
}: {
  id: string
  card: RefCard | undefined
  onRemove: () => void
}) {
  const t = useT()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const name = card?.title ?? t('media.field.missing')
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={cn('relative', isDragging && 'z-10')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={name}
        className="block w-full cursor-grab touch-none rounded active:cursor-grabbing"
      >
        <Thumb card={card} />
      </button>
      <IconButton
        label={t('media.field.removeItem', { name })}
        icon={<X size={14} aria-hidden="true" />}
        onClick={onRemove}
        tooltip={false}
        className="absolute right-1 top-1 min-h-8 min-w-8 rounded-full bg-panel/90 text-fg shadow md:min-h-7 md:min-w-7"
      />
    </li>
  )
}

/** `x-ref: {kind: media}`: pick from the library (with upload), one file or an ordered list. */
export function MediaRefField({ name, node, label, description }: WidgetProps) {
  const t = useT()
  const queryClient = useQueryClient()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const [pickerOpen, setPickerOpen] = useState(false)
  const hint = node.schema['x-ref']
  const many = Boolean(hint?.many)
  const accept = hint?.accept as MediaKind[] | undefined
  const ids: string[] = many
    ? ((field.value as string[] | null) ?? [])
    : field.value
      ? [field.value as string]
      : []
  const { data: cards = [] } = useRefCards(queryClient, 'media', ids)
  const cardOf = (id: string) => cards.find((c) => c.id === id)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // The chosen files are known: their cards show at once, without a request.
  const remember = (items: MediaItem[]) => rememberCards(queryClient, 'media', items.map(toCard))

  const pick = (items: MediaItem[]) => {
    if (many) {
      const next = [...ids, ...items.map((i) => i.id).filter((id) => !ids.includes(id))]
      remember(items)
      field.onChange(next)
    } else if (items[0]) {
      remember(items)
      field.onChange(items[0].id)
    }
  }

  const removeAt = (id: string) => {
    if (many) field.onChange(ids.filter((i) => i !== id))
    else field.onChange(null)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    field.onChange(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  const single = ids[0] ? cardOf(ids[0]) : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {many ? (
        <>
          {ids.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ids} strategy={rectSortingStrategy}>
                <ul className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {ids.map((id) => (
                    <SortableTile
                      key={id}
                      id={id}
                      card={cardOf(id)}
                      onRemove={() => removeAt(id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          <Button
            ref={field.ref}
            size="sm"
            icon={<Plus size={16} aria-hidden="true" />}
            className="self-start"
            onClick={() => setPickerOpen(true)}
          >
            {t('media.field.add')}
          </Button>
        </>
      ) : ids[0] ? (
        <div className="flex items-center gap-3 rounded border border-line p-2">
          <Thumb card={single} className="w-16 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{single?.title ?? t('media.field.missing')}</span>
            {single?.subtitle && (
              <span className="font-mono text-xs text-mute">{single.subtitle}</span>
            )}
          </div>
          <Button
            ref={field.ref}
            size="sm"
            icon={<Replace size={16} aria-hidden="true" />}
            onClick={() => setPickerOpen(true)}
          >
            {t('media.field.replace')}
          </Button>
          <IconButton
            label={t('media.field.remove')}
            icon={<X size={16} aria-hidden="true" />}
            onClick={() => removeAt(ids[0] as string)}
          />
        </div>
      ) : (
        <Button
          ref={field.ref}
          icon={<Plus size={16} aria-hidden="true" />}
          className="self-start"
          onClick={() => setPickerOpen(true)}
        >
          {t('media.field.choose')}
        </Button>
      )}
      {description && <p className="text-xs text-mute">{description}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        accept={accept}
        many={many}
        initial={many ? ids : []}
        onPick={pick}
      />
    </div>
  )
}
