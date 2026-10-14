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
import { useQueryClient } from '@tanstack/react-query'
import { GripVertical, Plus, Replace, X } from 'lucide-react'
import { useState } from 'react'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/cn'
import type { LookupKind, RefCard } from '../../../api/queries'
import { useRefCards } from '../../../api/refCards'
import { CardText, CardThumb, EntityPicker } from '../../EntityPicker'
import { useT } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { IconButton } from '../../../ui/IconButton'
import type { WidgetProps } from '../registry'
import { useFieldError } from '../useFieldError'

function SortableRow({ id, card, onRemove }: { id: string; card?: RefCard; onRemove: () => void }) {
  const t = useT()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id })
  const name = card?.title ?? t('refs.missing')
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className="flex items-center gap-2 rounded border border-line bg-panel p-1.5"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${t('form.array.drag')}: ${name}`}
        className="inline-flex min-h-touch min-w-touch cursor-grab touch-none items-center justify-center rounded text-mute hover:bg-sunken md:min-h-8 md:min-w-8"
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <CardThumb card={card} className="w-9" />
      {card ? <CardText card={card} /> : <span className="flex-1 text-sm text-mute">{name}</span>}
      <IconButton
        label={t('refs.remove', { name })}
        icon={<X size={16} aria-hidden="true" />}
        onClick={onRemove}
      />
    </li>
  )
}

/** `x-ref` to entities (projects, people…): one object, or an ordered list. */
export function EntityRefField({ name, node, label, description }: WidgetProps) {
  const t = useT()
  const queryClient = useQueryClient()
  const { field } = useController({ name })
  const error = useFieldError(name)
  const [open, setOpen] = useState(false)
  const hint = node.schema['x-ref']
  const kind = (hint?.kind ?? 'project') as LookupKind
  const many = Boolean(hint?.many)
  const ids: string[] = many
    ? ((field.value as string[] | null) ?? [])
    : field.value
      ? [field.value as string]
      : []
  const { data: cards = [] } = useRefCards(queryClient, kind, ids)
  const cardOf = (id: string) => cards.find((c) => c.id === id)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const pick = (picked: RefCard[]) => {
    if (many) field.onChange([...ids, ...picked.map((c) => c.id).filter((id) => !ids.includes(id))])
    else if (picked[0]) field.onChange(picked[0].id)
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
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-1.5">
                  {ids.map((id) => (
                    <SortableRow
                      key={id}
                      id={id}
                      card={cardOf(id)}
                      onRemove={() => field.onChange(ids.filter((i) => i !== id))}
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
            onClick={() => setOpen(true)}
          >
            {t('refs.add')}
          </Button>
        </>
      ) : ids[0] ? (
        <div className={cn('flex items-center gap-2 rounded border border-line p-1.5')}>
          <CardThumb card={single} className="w-9" />
          {single ? (
            <CardText card={single} />
          ) : (
            <span className="flex-1 text-sm text-mute">{t('refs.missing')}</span>
          )}
          <Button
            ref={field.ref}
            size="sm"
            icon={<Replace size={16} aria-hidden="true" />}
            onClick={() => setOpen(true)}
          >
            {t('refs.replace')}
          </Button>
          <IconButton
            label={t('refs.clear')}
            icon={<X size={16} aria-hidden="true" />}
            onClick={() => field.onChange(null)}
          />
        </div>
      ) : (
        <Button
          ref={field.ref}
          size="sm"
          icon={<Plus size={16} aria-hidden="true" />}
          className="self-start"
          onClick={() => setOpen(true)}
        >
          {t('refs.choose_one')}
        </Button>
      )}
      {description && <p className="text-xs text-mute">{description}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <EntityPicker
        open={open}
        onOpenChange={setOpen}
        kind={kind}
        title={label}
        many={many}
        chosen={many ? ids : []}
        onPick={pick}
      />
    </div>
  )
}
