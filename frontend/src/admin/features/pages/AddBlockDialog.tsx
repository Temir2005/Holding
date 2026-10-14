import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { cn } from '@/lib/cn'
import { sectionTypesQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { Dialog } from '../../ui/Dialog'
import { Skeleton } from '../../ui/feedback'
import { controlClass } from '../../ui/styles'

/** Block types from `GET /admin/section-types`: a new type on the backend shows up here. */
export function AddBlockDialog({
  open,
  onOpenChange,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (type: string) => void
}) {
  const t = useT()
  const { data: types } = useQuery(sectionTypesQuery())
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim().toLowerCase())
  const shown = (types ?? []).filter(
    (s) => !q || s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSearch('')
        onOpenChange(next)
      }}
      title={t('blocks.chooseType')}
      size="lg"
    >
      <div className="flex flex-col gap-3">
        <label className="relative">
          <span className="sr-only">{t('blocks.searchTypes')}</span>
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"
          />
          <input
            type="search"
            autoFocus
            value={search}
            placeholder={t('blocks.searchTypes')}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(controlClass, 'pl-9')}
          />
        </label>
        {!types ? (
          <Skeleton className="h-48" />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {shown.map((s) => (
              <li key={s.type}>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    onChoose(s.type)
                  }}
                  className="flex h-full w-full flex-col gap-1 rounded-lg border border-line p-3 text-left hover:border-line-strong hover:bg-sunken"
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="text-sm text-mute">{s.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
