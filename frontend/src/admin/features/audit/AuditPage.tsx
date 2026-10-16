import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ExternalLink, ScrollText, SearchX } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { auditQuery, changedFields, type AuditEntry, type AuditFilters } from '../../api/audit'
import { entityTypesQuery, metaOptions, metaQuery } from '../../api/queries'
import { usersQuery } from '../../api/users'
import type { JsonSchema } from '../../forms/schema/types'
import { entityHref } from '../../forms/usage'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback'
import { controlClass } from '../../ui/styles'
import { optionLabel } from '../leads/leadUpdate'
import { formatDate } from '../media/format'
import { periodEnd, periodStart } from '../period'
import { PageTitle } from '../Placeholder'

const FILTERS = ['user', 'entity', 'action', 'from', 'to', 'id'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A value from the log, readable: texts by language, lists and objects as JSON. */
function Value({ value }: { value: unknown }) {
  const t = useT()
  if (value === null || value === undefined || value === '')
    return <span className="text-mute">—</span>
  if (typeof value === 'boolean')
    return <>{value ? t('collection.filters.yes') : t('collection.filters.no')}</>
  if (typeof value === 'string' || typeof value === 'number') {
    return <span className="whitespace-pre-wrap break-words">{String(value)}</span>
  }
  const localized =
    isRecord(value) &&
    Object.keys(value).length > 0 &&
    Object.entries(value).every(([k, v]) => /^(ru|kk|en)$/.test(k) && typeof v === 'string')
  if (localized) {
    return (
      <span className="flex flex-col gap-0.5">
        {Object.entries(value).map(([code, text]) => (
          <span key={code} className="break-words">
            <span className="mr-1 font-mono text-xs text-mute">{code.toUpperCase()}</span>
            {String(text)}
          </span>
        ))}
      </span>
    )
  }
  return (
    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-sunken p-2 font-mono text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

/** Field names in Russian, from the entity's form schema when there is one. */
function useFieldLabel(entityType: string) {
  const t = useT()
  const { data: entities } = useQuery(entityTypesQuery())
  const schema = entities?.find((e) => e.type === entityType)?.schema as JsonSchema | undefined
  return (key: string) =>
    schema?.properties?.[key]?.title ?? t(`audit.fields.${key}`, { defaultValue: key })
}

function Changes({ entry }: { entry: AuditEntry }) {
  const t = useT()
  const label = useFieldLabel(entry.entity_type)
  const diff = changedFields(entry)
  if (diff) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-xs text-mute">
            <tr>
              <th className="py-1 pr-3 font-normal">{t('audit.field')}</th>
              <th className="py-1 pr-3 font-normal">{t('audit.before')}</th>
              <th className="py-1 font-normal">{t('audit.after')}</th>
            </tr>
          </thead>
          <tbody>
            {diff.map(([key, before, after]) => (
              <tr key={key} className="border-t border-line align-top">
                <th scope="row" className="py-2 pr-3 font-medium">
                  {label(key)}
                </th>
                <td className="py-2 pr-3">
                  <Value value={before} />
                </td>
                <td className="py-2">
                  <Value value={after} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (!entry.changes || Object.keys(entry.changes).length === 0) {
    return <p className="text-sm text-mute">{t('audit.noDetails')}</p>
  }
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm md:grid-cols-[minmax(8rem,auto)_1fr]">
      {Object.entries(entry.changes).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-medium">{label(key)}</dt>
          <dd className="min-w-0">
            <Value value={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function EntryRow({ entry }: { entry: AuditEntry }) {
  const t = useT()
  const { data: meta } = useQuery(metaQuery())
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const href = entityHref(entry.entity_type, entry.entity_id)
  const entity = optionLabel(meta, 'audit_entity_types', entry.entity_type)
  const action = optionLabel(meta, 'audit_actions', entry.action)
  return (
    <li className="rounded-lg border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 md:grid md:grid-cols-[auto_9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={t('audit.details', { action, entity })}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded text-mute hover:bg-sunken md:min-h-8 md:min-w-8"
        >
          {open ? (
            <ChevronDown size={16} aria-hidden="true" />
          ) : (
            <ChevronRight size={16} aria-hidden="true" />
          )}
        </button>
        <span className="text-xs text-mute">{formatDate(entry.created_at)}</span>
        <span className="truncate text-sm">{entry.user?.full_name ?? t('audit.system')}</span>
        <span className="text-sm font-medium">{action}</span>
        <span className="basis-full text-sm md:basis-auto">
          {href ? (
            <Link
              to={href}
              className="inline-flex items-center gap-1 text-accent-ink underline underline-offset-4"
            >
              {entity}
              <ExternalLink size={14} aria-hidden="true" />
            </Link>
          ) : (
            entity
          )}
        </span>
      </div>
      {open && (
        <div id={detailsId} className="border-t border-line p-3">
          <Changes entry={entry} />
        </div>
      )}
    </li>
  )
}

function FilterSelect({
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
    <div className="flex min-w-36 flex-1 flex-col gap-1 md:max-w-56 md:flex-none">
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

function DayInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string | null) => void
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

/** Who changed what (admin only): filters by user, entity and period; "before → after". */
export function AuditPage() {
  const t = useT()
  const { data: meta } = useQuery(metaQuery())
  const { data: users } = useQuery(usersQuery())
  const [params, setParams] = useSearchParams()
  // One update for several params: React Router's updater sees the params of the render.
  const set = (name: string, value: string | null, clear: string[] = []) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        for (const other of clear) next.delete(other)
        return next
      },
      { replace: true },
    )
  const filters: AuditFilters = {
    user_id: params.get('user'),
    entity_type: params.get('entity'),
    entity_id: params.get('id'),
    action: params.get('action'),
    since: periodStart(params.get('from')),
    until: periodEnd(params.get('to')),
  }
  const filtered = FILTERS.some((name) => params.get(name))
  const list = useInfiniteQuery(auditQuery(filters))
  const entries = list.data?.pages.flatMap((p) => p.items) ?? []
  const reset = () => setParams(new URLSearchParams(), { replace: true })

  let body: ReactNode
  if (list.isPending) {
    body = (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  } else if (list.isError) {
    body = <ErrorState onRetry={() => void list.refetch()} />
  } else if (entries.length === 0) {
    body = filtered ? (
      <EmptyState
        icon={<SearchX size={28} aria-hidden="true" />}
        title={t('collection.nothingFound')}
        action={<Button onClick={reset}>{t('collection.resetFilters')}</Button>}
      />
    ) : (
      <EmptyState icon={<ScrollText size={28} aria-hidden="true" />} title={t('audit.empty')} />
    )
  } else {
    body = (
      <>
        <ul className="flex flex-col gap-2" aria-label={t('nav.audit')}>
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
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
    )
  }

  return (
    <>
      <PageTitle>{t('nav.audit')}</PageTitle>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FilterSelect
          label={t('audit.user')}
          value={params.get('user') ?? ''}
          options={(users?.items ?? []).map((u) => ({ value: u.id, label: u.full_name }))}
          onChange={(v) => set('user', v)}
        />
        <FilterSelect
          label={t('audit.entity')}
          value={params.get('entity') ?? ''}
          options={metaOptions(meta, 'audit_entity_types')}
          onChange={(v) => set('entity', v, ['id'])}
        />
        <FilterSelect
          label={t('audit.action')}
          value={params.get('action') ?? ''}
          options={metaOptions(meta, 'audit_actions')}
          onChange={(v) => set('action', v)}
        />
        <DayInput
          label={t('leads.from')}
          value={params.get('from') ?? ''}
          onChange={(v) => set('from', v)}
        />
        <DayInput
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
      {body}
    </>
  )
}
