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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { get, useFieldArray, useFormState, useWatch } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { useT } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { IconButton } from '../../../ui/IconButton'
import { joinPath, useSchemaFormContext } from '../context'
import { FieldRenderer } from '../Field'
import { useFieldError } from '../useFieldError'
import { ObjectFields } from '../ObjectFields'
import { JsonField } from './JsonField'
import type { WidgetProps } from '../registry'
import { fieldKind, itemNode } from '../resolve'
import type { ResolvedNode } from '../types'
import { emptyValue, previewText } from '../values'

const KEY = 'fieldKey'

interface ItemCardProps {
  id: string
  index: number
  count: number
  name: string
  item: ResolvedNode
  itemTitle: string
  expanded: boolean
  onToggle: () => void
  onMove: (to: number) => void
  onRemove: () => void
  children: ReactNode
}

function ItemCard({
  id,
  index,
  count,
  name,
  item,
  itemTitle,
  expanded,
  onToggle,
  onMove,
  onRemove,
  children,
}: ItemCardProps) {
  const t = useT()
  const { root } = useSchemaFormContext()
  const path = joinPath(name, index)
  const value: unknown = useWatch({ name: path })
  const { errors } = useFormState({ name: path })
  const hasError = Boolean(get(errors, path))
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const preview = previewText(item, value, root).trim()
  const title = preview || t('form.array.item', { n: index + 1 })
  // Cards with problems stay open, so errors are visible and focusable.
  const open = expanded || hasError

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={cn(
        'rounded-lg border bg-panel',
        hasError ? 'border-danger' : 'border-line',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <div className="flex items-center gap-1 px-1 py-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${t('form.array.drag')}: ${title}`}
          className="inline-flex min-h-touch min-w-touch cursor-grab touch-none items-center justify-center rounded text-mute hover:bg-sunken active:cursor-grabbing md:min-h-8 md:min-w-8"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-h-touch min-w-0 flex-1 items-center gap-2 rounded px-1 text-left text-sm md:min-h-8"
        >
          <span className="font-mono text-xs text-mute">{index + 1}</span>
          <span className={cn('truncate', !preview && 'text-mute')}>{title}</span>
          <span className="sr-only">
            {itemTitle}. {open ? t('form.array.collapse') : t('form.array.expand')}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn('ml-auto shrink-0 text-mute transition-transform', open && 'rotate-180')}
          />
        </button>
        <IconButton
          label={t('form.array.moveUp')}
          icon={<ArrowUp size={16} aria-hidden="true" />}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        />
        <IconButton
          label={t('form.array.moveDown')}
          icon={<ArrowDown size={16} aria-hidden="true" />}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        />
        <IconButton
          label={t('form.array.remove')}
          icon={<Trash2 size={16} aria-hidden="true" />}
          onClick={onRemove}
          className="hover:text-danger"
        />
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t border-line p-3 md:p-4">{children}</div>
      )}
    </li>
  )
}

/** A list of items: add, remove, collapse, drag (or move with buttons from the keyboard). */
export function ArrayField(props: WidgetProps) {
  const { root } = useSchemaFormContext()
  const kind = fieldKind(itemNode(props.node.schema, root), root)
  // react-hook-form field arrays hold objects; lists of plain values get the JSON editor.
  return kind === 'object' || kind === 'localized' ? (
    <ItemList {...props} />
  ) : (
    <JsonField {...props} />
  )
}

function ItemList({ name, node, label, description }: WidgetProps) {
  const t = useT()
  const { root } = useSchemaFormContext()
  const item = itemNode(node.schema, root)
  const itemKind = fieldKind(item, root)
  const itemTitle = item.schema.title && item.schema.title !== label ? item.schema.title : ''
  const { fields, append, remove, move } = useFieldArray({ name, keyName: KEY })
  const error = useFieldError(name)
  // Existing items start collapsed in longer lists; new ones are open (not in the set).
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(fields.length > 2 ? fields.map((f) => f[KEY] as string) : []),
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const keys = fields.map((f) => f[KEY] as string)
  const full = node.schema.maxItems !== undefined && fields.length >= node.schema.maxItems

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    move(keys.indexOf(String(active.id)), keys.indexOf(String(over.id)))
  }

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const add = () => append(emptyValue(item, root) as object)

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 flex w-full items-center gap-2 text-sm font-medium">
        {label}
        <span className="font-mono text-xs text-mute">{fields.length}</span>
      </legend>
      {description && <p className="-mt-1 text-xs text-mute">{description}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {fields.length === 0 ? (
        <p className="rounded border border-dashed border-line-strong px-3 py-4 text-center text-sm text-mute">
          {t('form.array.empty')}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: { draggable: t('form.array.drag') },
            announcements: {
              onDragStart: () => t('form.array.drag'),
              onDragOver: ({ over }) =>
                over ? t('form.array.moved', { n: keys.indexOf(String(over.id)) + 1 }) : '',
              onDragEnd: ({ over }) =>
                over ? t('form.array.moved', { n: keys.indexOf(String(over.id)) + 1 }) : '',
              onDragCancel: () => '',
            },
          }}
        >
          <SortableContext items={keys} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {fields.map((f, index) => {
                const key = f[KEY] as string
                return (
                  <ItemCard
                    key={key}
                    id={key}
                    index={index}
                    count={fields.length}
                    name={name}
                    item={item}
                    itemTitle={itemTitle}
                    expanded={!collapsed.has(key)}
                    onToggle={() => toggle(key)}
                    onMove={(to) => move(index, to)}
                    onRemove={() => remove(index)}
                  >
                    {itemKind === 'object' ? (
                      <ObjectFields schema={item.schema} prefix={joinPath(name, index)} />
                    ) : (
                      <FieldRenderer
                        name={joinPath(name, index)}
                        node={item}
                        required
                        fallbackLabel={t('form.array.item', { n: index + 1 })}
                      />
                    )}
                  </ItemCard>
                )
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <Button
        size="sm"
        icon={<Plus size={16} aria-hidden="true" />}
        className="self-start"
        disabled={full}
        onClick={add}
      >
        {itemTitle ? t('form.array.addItem', { title: itemTitle }) : t('form.array.add')}
      </Button>
    </fieldset>
  )
}
