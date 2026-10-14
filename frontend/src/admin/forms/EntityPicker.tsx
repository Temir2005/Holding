import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ImageOff, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { cn } from '@/lib/cn'
import { lookupQuery, type LookupKind, type RefCard } from '../api/queries'
import { rememberCards } from '../api/refCards'
import { useT } from '../i18n'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Badge, EmptyState, Skeleton } from '../ui/feedback'
import { controlClass } from '../ui/styles'

export function CardThumb({ card, className }: { card: RefCard | undefined; className?: string }) {
  return (
    <span
      className={cn(
        'flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded bg-sunken',
        className,
      )}
    >
      {card?.thumb_url ? (
        <img src={card.thumb_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageOff size={16} aria-hidden="true" className="text-mute" />
      )}
    </span>
  )
}

/** Name, details and "not on the site" mark of a referenced object. */
export function CardText({ card }: { card: RefCard }) {
  const t = useT()
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="flex items-center gap-2">
        <span className="truncate text-sm">{card.title}</span>
        {card.is_published === false && <Badge tone="warning">{t('refs.unpublished')}</Badge>}
      </span>
      {card.subtitle && <span className="truncate text-xs text-mute">{card.subtitle}</span>}
    </span>
  )
}

interface EntityPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: LookupKind
  title: string
  many?: boolean
  /** Already chosen: shown as chosen and not offered again. */
  chosen?: readonly string[]
  onPick: (cards: RefCard[]) => void
}

/** Search entities of one kind (`GET /admin/lookup`) and choose one or several. */
export function EntityPicker({
  open,
  onOpenChange,
  kind,
  title,
  many = false,
  chosen = [],
  onPick,
}: EntityPickerProps) {
  const t = useT()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())
  const [picked, setPicked] = useState<RefCard[]>([])
  const { data, isPending } = useQuery({ ...lookupQuery(kind, q), enabled: open })

  const close = () => {
    setPicked([])
    setSearch('')
    onOpenChange(false)
  }

  const choose = (card: RefCard) => {
    if (chosen.includes(card.id)) return
    if (!many) {
      rememberCards(queryClient, kind, [card])
      onPick([card])
      close()
      return
    }
    setPicked((prev) =>
      prev.some((c) => c.id === card.id) ? prev.filter((c) => c.id !== card.id) : [...prev, card],
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={title}
      size="md"
      footer={
        many ? (
          <>
            <Button onClick={close}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              disabled={picked.length === 0}
              onClick={() => {
                rememberCards(queryClient, kind, picked)
                onPick(picked)
                close()
              }}
            >
              {t('media.picker.chooseMany', { count: picked.length })}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <label className="relative">
          <span className="sr-only">{t('refs.search')}</span>
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"
          />
          <input
            type="search"
            autoFocus
            value={search}
            placeholder={t('refs.search')}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(controlClass, 'pl-9')}
          />
        </label>
        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState title={t('refs.nothing')} />
        ) : (
          <ul className="flex flex-col gap-1">
            {data.map((card) => {
              const already = chosen.includes(card.id)
              const selected = already || picked.some((c) => c.id === card.id)
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => choose(card)}
                    aria-pressed={many ? selected : undefined}
                    aria-label={t('refs.choose', { name: card.title })}
                    className={cn(
                      'flex w-full items-center gap-3 rounded border p-2 text-left',
                      selected
                        ? 'border-accent-ink bg-sunken'
                        : 'border-line hover:border-line-strong',
                      already && 'opacity-60',
                    )}
                  >
                    <CardThumb card={card} className="w-10" />
                    <CardText card={card} />
                    {selected && <Check size={16} aria-hidden="true" className="text-accent-ink" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
