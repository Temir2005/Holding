import { queryOptions, useQuery } from '@tanstack/react-query'
import { ArrowRight, Briefcase, Inbox, Upload } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { leadsKey } from '../../api/leads'
import { acceptAttribute } from '../../api/media'
import { pagesListQuery, pageTitle } from '../../api/pages'
import { adminKey, metaQuery } from '../../api/queries'
import { entityHref } from '../../forms/usage'
import { useT } from '../../i18n'
import { hasRole, useCurrentUser } from '../../session/context'
import { Button, ButtonLink } from '../../ui/Button'
import { Badge, ErrorState, Skeleton } from '../../ui/feedback'
import { optionLabel } from '../leads/leadUpdate'
import { formatDate } from '../media/format'
import { UploadPanel } from '../media/UploadPanel'
import { useUploads } from '../media/useUploads'
import { PageStatusBadge } from '../pages/PageStatusBadge'
import { PageTitle } from '../Placeholder'

const LATEST_LEADS = 5
const LATEST_ACTIONS = 8

const newLeadsQuery = () =>
  queryOptions({
    queryKey: [...leadsKey, 'dashboard'],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/leads', {
        query: { status: 'new', page_size: LATEST_LEADS },
        signal,
      }),
  })

const latestActionsQuery = () =>
  queryOptions({
    queryKey: [...adminKey, 'audit', 'dashboard'],
    queryFn: ({ signal }) =>
      api.get('/api/v1/admin/audit-log', { query: { page_size: LATEST_ACTIONS }, signal }),
  })

function Card({
  title,
  more,
  children,
}: {
  title: ReactNode
  more?: { to: string; label: string }
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {more && (
          <Link
            to={more.to}
            className="inline-flex min-h-touch items-center gap-1 text-sm text-accent-ink underline-offset-4 hover:underline md:min-h-8"
          >
            {more.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

const rowsSkeleton = (n: number) => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: n }, (_, i) => (
      <Skeleton key={i} className="h-10" />
    ))}
  </div>
)

function NewLeads() {
  const t = useT()
  const { data: meta } = useQuery(metaQuery())
  const leads = useQuery(newLeadsQuery())
  const total = leads.data?.total ?? 0
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {t('dashboard.newLeads')}
          {total > 0 && <Badge tone="info">{total}</Badge>}
        </span>
      }
      more={{ to: '/admin/leads?status=new', label: t('dashboard.allLeads') }}
    >
      {leads.isPending ? (
        rowsSkeleton(3)
      ) : leads.isError ? (
        <ErrorState compact onRetry={() => void leads.refetch()} />
      ) : total === 0 ? (
        <p className="text-sm text-mute">{t('dashboard.noNewLeads')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {leads.data.items.map((lead) => (
            <li key={lead.id}>
              <Link
                to={`/admin/leads?lead=${lead.id}`}
                className="flex min-h-touch flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded px-1 py-2 hover:bg-sunken"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{lead.name}</span>
                  <span className="block truncate text-xs text-mute">
                    {optionLabel(meta, 'lead_types', lead.type)}
                  </span>
                </span>
                <span className="text-xs text-mute">{formatDate(lead.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function UnpublishedPages() {
  const t = useT()
  const pages = useQuery(pagesListQuery())
  const changed = (pages.data?.items ?? []).filter((p) => p.has_unpublished_changes)
  return (
    <Card
      title={t('dashboard.unpublished')}
      more={{ to: '/admin/pages', label: t('dashboard.allPages') }}
    >
      {pages.isPending ? (
        rowsSkeleton(3)
      ) : pages.isError ? (
        <ErrorState compact onRetry={() => void pages.refetch()} />
      ) : changed.length === 0 ? (
        <p className="text-sm text-mute">{t('dashboard.allPublished')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {changed.map((page) => (
            <li key={page.id}>
              <Link
                to={`/admin/pages/${page.id}`}
                className="flex min-h-touch flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded px-1 py-2 hover:bg-sunken"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{pageTitle(page)}</span>
                  <span className="block truncate font-mono text-xs text-mute">/{page.slug}</span>
                </span>
                <PageStatusBadge page={page} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function LatestActions() {
  const t = useT()
  const { data: meta } = useQuery(metaQuery())
  const actions = useQuery(latestActionsQuery())
  return (
    <Card
      title={t('dashboard.latestActions')}
      more={{ to: '/admin/audit', label: t('dashboard.allActions') }}
    >
      {actions.isPending ? (
        rowsSkeleton(4)
      ) : actions.isError ? (
        <ErrorState compact onRetry={() => void actions.refetch()} />
      ) : actions.data.items.length === 0 ? (
        <p className="text-sm text-mute">{t('audit.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {actions.data.items.map((entry) => {
            const href = entityHref(entry.entity_type, entry.entity_id)
            const what = `${optionLabel(meta, 'audit_actions', entry.action)}: ${optionLabel(
              meta,
              'audit_entity_types',
              entry.entity_type,
            ).toLowerCase()}`
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2"
              >
                <span className="min-w-0">
                  {href ? (
                    <Link to={href} className="font-medium underline-offset-4 hover:underline">
                      {what}
                    </Link>
                  ) : (
                    <span className="font-medium">{what}</span>
                  )}
                  <span className="block truncate text-xs text-mute">
                    {entry.user?.full_name ?? t('audit.system')}
                  </span>
                </span>
                <span className="text-xs text-mute">{formatDate(entry.created_at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** "Загрузить файлы" opens the file chooser right here; progress shows under the actions. */
function QuickActions() {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const { data: meta } = useQuery(metaQuery())
  const uploads = useUploads()
  const finished = uploads.items.some((item) => item.status === 'done')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <ButtonLink
          to="/admin/collections/projects/new"
          variant="primary"
          icon={<Briefcase size={16} aria-hidden="true" />}
        >
          {t('collection.new.projects')}
        </ButtonLink>
        <Button
          icon={<Upload size={16} aria-hidden="true" />}
          onClick={() => input.current?.click()}
        >
          {t('media.upload')}
        </Button>
        <ButtonLink to="/admin/leads" icon={<Inbox size={16} aria-hidden="true" />}>
          {t('nav.leads')}
        </ButtonLink>
        <input
          ref={input}
          type="file"
          multiple
          accept={acceptAttribute(meta)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="dashboard-file-input"
          onChange={(e) => {
            if (e.target.files) uploads.add([...e.target.files])
            e.target.value = ''
          }}
        />
      </div>
      <UploadPanel
        items={uploads.items}
        onRetry={uploads.retry}
        onDismiss={uploads.dismiss}
        onClearDone={uploads.clearDone}
      />
      {finished && (
        <Link
          to="/admin/media"
          className="self-start text-sm text-accent-ink underline underline-offset-4"
        >
          {t('dashboard.openMedia')}
        </Link>
      )}
    </div>
  )
}

/** The first screen: what needs attention and the most frequent actions. */
export function DashboardPage() {
  const t = useT()
  const user = useCurrentUser()
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <PageTitle>{t('nav.dashboard')}</PageTitle>
        <p className="-mt-3 text-sm text-mute md:-mt-5">
          {t('dashboard.hello', { name: user.full_name })}
        </p>
      </div>
      <QuickActions />
      <div className="grid gap-4 xl:grid-cols-2">
        <NewLeads />
        <UnpublishedPages />
        {hasRole(user, 'admin') && (
          <div className="xl:col-span-2">
            <LatestActions />
          </div>
        )}
      </div>
    </div>
  )
}
