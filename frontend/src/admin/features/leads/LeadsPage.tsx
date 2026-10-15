import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Download, Inbox, Search, SearchX } from 'lucide-react'
import { useDeferredValue, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import {
  downloadLeadsCsv,
  leadQuery,
  leadsListQuery,
  type Lead,
  type LeadFilters,
  type LeadStatus,
  type LeadType,
} from '../../api/leads'
import { metaOptions, metaQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Dialog'
import { EmptyState, Skeleton } from '../../ui/feedback'
import { controlClass } from '../../ui/styles'
import { useToast } from '../../ui/toast-context'
import { formatDate } from '../media/format'
import { periodEnd, periodStart } from '../period'
import { PageTitle } from '../Placeholder'
import { LeadDetails } from './LeadDetails'
import { LeadStatusControl } from './LeadStatusControl'
import { optionLabel } from './leadUpdate'

const FILTERS = ['q', 'type', 'status', 'from', 'to'] as const
const LEAD_PARAM = 'lead'

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string | null) => void
}) {
  const t = useT()
  const id = useId()
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1 md:max-w-52 md:flex-none">
      <label htmlFor={id} className="text-xs text-mute">
        {label}
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

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string | null) => void
}) {
  const id = useId()
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1 md:max-w-44 md:flex-none">
      <label htmlFor={id} className="text-xs text-mute">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className={controlClass}
      />
    </div>
  )
}

function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const t = useT()
  const { data: meta } = useQuery(metaQuery())
  const contact = [lead.phone, lead.email].filter(Boolean).join(' · ')
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-line bg-panel p-3 md:grid md:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-center md:gap-4',
        lead.status === 'new' && 'border-l-4 border-l-info',
      )}
    >
      <span className="text-xs text-mute">{formatDate(lead.created_at)}</span>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-touch min-w-0 flex-col items-start justify-center rounded text-left hover:underline md:min-h-9"
        aria-label={t('leads.open', { name: lead.name })}
      >
        <span className="max-w-full truncate font-medium">{lead.name}</span>
        {contact && <span className="max-w-full truncate text-xs text-mute">{contact}</span>}
      </button>
      <span className="text-sm">{optionLabel(meta, 'lead_types', lead.type)}</span>
      <span className="line-clamp-2 text-sm text-mute">{lead.message || '—'}</span>
      <LeadStatusControl lead={lead} />
    </li>
  )
}

/** Leads from the site form: filters, status in one click, manager note, CSV export. */
export function LeadsPage() {
  const t = useT()
  const toast = useToast()
  const { data: meta } = useQuery(metaQuery())
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDeferredValue(search.trim())
  const [exporting, setExporting] = useState(false)

  const set = (name: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true },
    )

  const filters: LeadFilters = {
    q,
    type: (params.get('type') as LeadType | null) ?? null,
    status: (params.get('status') as LeadStatus | null) ?? null,
    created_from: periodStart(params.get('from')),
    created_to: periodEnd(params.get('to')),
  }
  const filtered = FILTERS.some((name) => params.get(name))
  const list = useInfiniteQuery(leadsListQuery(filters))
  const leads = list.data?.pages.flatMap((p) => p.items) ?? []
  const total = list.data?.pages[0]?.total ?? 0

  // `?lead=<id>` opens a lead, also one that is not on the loaded pages (a link from the log).
  const openId = params.get(LEAD_PARAM)
  const listed = leads.find((lead) => lead.id === openId)
  const single = useQuery({ ...leadQuery(openId ?? ''), enabled: Boolean(openId) && !listed })
  const open = listed ?? (openId ? (single.data ?? null) : null)

  const reset = () => {
    setSearch('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadLeadsCsv(filters)
    } catch (error) {
      toast.error(error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        <PageTitle>{t('nav.leads')}</PageTitle>
        <Button
          icon={<Download size={16} aria-hidden="true" />}
          loading={exporting}
          disabled={total === 0}
          onClick={() => void exportCsv()}
        >
          {t('leads.export')}
        </Button>
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
            placeholder={t('leads.search')}
            aria-label={t('leads.search')}
            className={cn(controlClass, 'pl-9')}
          />
        </div>
        <Select
          label={t('leads.fields.type')}
          value={params.get('type') ?? ''}
          options={metaOptions(meta, 'lead_types')}
          onChange={(v) => set('type', v)}
        />
        <Select
          label={t('leads.fields.status')}
          value={params.get('status') ?? ''}
          options={metaOptions(meta, 'lead_statuses')}
          onChange={(v) => set('status', v)}
        />
        <DateInput
          label={t('leads.from')}
          value={params.get('from') ?? ''}
          onChange={(v) => set('from', v)}
        />
        <DateInput
          label={t('leads.to')}
          value={params.get('to') ?? ''}
          onChange={(v) => set('to', v)}
        />
        {filtered && (
          <Button variant="ghost" onClick={reset}>
            {t('collection.resetFilters')}
          </Button>
        )}
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX size={28} aria-hidden="true" />}
            title={t('collection.nothingFound')}
            action={<Button onClick={reset}>{t('collection.resetFilters')}</Button>}
          />
        ) : (
          <EmptyState
            icon={<Inbox size={28} aria-hidden="true" />}
            title={t('leads.empty')}
            text={t('leads.emptyText')}
          />
        )
      ) : (
        <>
          <p className="mb-2 text-xs text-mute" aria-live="polite">
            {t('leads.total', { count: total })}
          </p>
          <ul className="flex flex-col gap-2" aria-label={t('nav.leads')}>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onOpen={() => set(LEAD_PARAM, lead.id)} />
            ))}
          </ul>
          {list.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {t('collection.showMore')}
              </Button>
            </div>
          )}
        </>
      )}
      <Sheet
        open={open !== null}
        onOpenChange={(next) => !next && set(LEAD_PARAM, null)}
        title={open ? t('leads.title', { name: open.name }) : ''}
      >
        {open && <LeadDetails key={open.id} lead={open} />}
      </Sheet>
    </>
  )
}
