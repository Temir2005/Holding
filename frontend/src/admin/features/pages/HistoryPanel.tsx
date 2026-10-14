import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, History } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { api } from '../../api/client'
import { AdminApiError } from '../../api/errors'
import {
  blockTitle,
  pageDetailQuery,
  pagesKey,
  revisionQuery,
  revisionsQuery,
  type PageDetail,
  type Revision,
} from '../../api/pages'
import { sectionTypesQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { useConfirm } from '../../ui/confirm-context'
import { Alert, Badge, EmptyState, Skeleton } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'
import { formatDate } from '../media/format'

interface SnapshotShape {
  page?: { title?: Record<string, string>; seo_title?: Record<string, string> }
  sections?: { id: string; type: string; is_visible: boolean; data: unknown }[]
}

function SnapshotView({ pageId, number }: { pageId: string; number: number }) {
  const t = useT()
  const { data } = useQuery(revisionQuery(pageId, number))
  const { data: types } = useQuery(sectionTypesQuery())
  if (!data) return <Skeleton className="h-24" />
  const snapshot = data.snapshot as SnapshotShape
  const labelOf = (type: string) => types?.find((s) => s.type === type)?.label ?? type
  return (
    <div className="flex flex-col gap-2 rounded bg-sunken p-3 text-sm">
      <p className="font-medium">{snapshot.page?.title?.ru}</p>
      {snapshot.page?.seo_title?.ru && (
        <p className="text-mute">SEO: {snapshot.page.seo_title.ru}</p>
      )}
      <p className="text-xs font-medium uppercase tracking-wide text-mute">{t('history.blocks')}</p>
      <ol className="flex flex-col gap-1">
        {(snapshot.sections ?? []).map((s, i) => (
          <li key={s.id} className={cn('flex gap-2', !s.is_visible && 'text-mute')}>
            <span className="w-5 text-right font-mono text-xs">{i + 1}</span>
            <span>
              <span className="text-xs uppercase tracking-wide text-mute">{labelOf(s.type)}</span>{' '}
              {blockTitle(s.data)}
              {!s.is_visible && ` (${t('history.hiddenBlock')})`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function RevisionItem({ page, revision }: { page: PageDetail; revision: Revision }) {
  const t = useT()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [problems, setProblems] = useState<string[]>([])

  const restore = useMutation({
    mutationFn: (publish: boolean) =>
      api.post('/api/v1/admin/pages/{page_id}/revisions/{number}/restore', {
        path: { page_id: page.id, number: revision.number },
        body: { version: page.version, publish },
      }),
    onSuccess: (_result, publish) => {
      void queryClient.invalidateQueries({ queryKey: pageDetailQuery(page.id).queryKey })
      void queryClient.invalidateQueries({ queryKey: [...pagesKey, 'list'] })
      void queryClient.invalidateQueries({ queryKey: revisionsQuery(page.id).queryKey })
      toast.success(publish ? t('history.restoredPublished') : t('history.restored'))
    },
    onError: (error) => {
      if (error instanceof AdminApiError && error.fieldIssues.length > 0) {
        setProblems(error.fieldIssues.map((i) => i.msg))
      } else toast.error(error)
    },
  })

  const ask = async (publish: boolean) => {
    const ok = await confirm({
      title: t('history.restoreTitle', { n: revision.number }),
      description: publish ? t('history.restorePublishText') : t('history.restoreText'),
      confirmLabel: publish ? t('history.restorePublish') : t('history.restore'),
      danger: true,
    })
    if (ok) restore.mutate(publish)
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{t('history.number', { n: revision.number })}</span>
        {revision.is_current && <Badge tone="success">{t('history.current')}</Badge>}
        <span className="text-xs text-mute">
          {formatDate(revision.created_at)} ·{' '}
          {revision.created_by?.full_name ?? t('history.system')}
        </span>
      </div>
      <p className={cn('text-sm', !revision.comment && 'text-mute')}>
        {revision.comment ?? t('history.noComment')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={expanded}
          icon={
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
          }
          onClick={() => setExpanded((v) => !v)}
        >
          {t('history.view')}
        </Button>
        <Button
          size="sm"
          loading={restore.isPending && restore.variables === false}
          onClick={() => void ask(false)}
        >
          {t('history.restore')}
        </Button>
        <Button
          size="sm"
          loading={restore.isPending && restore.variables === true}
          onClick={() => void ask(true)}
        >
          {t('history.restorePublish')}
        </Button>
      </div>
      {problems.length > 0 && (
        <Alert tone="danger" title={t('history.cannotRestore')}>
          <ul className="list-disc pl-4">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}
      {expanded && <SnapshotView pageId={page.id} number={revision.number} />}
    </li>
  )
}

/** Published versions, newest first: view, restore into the draft, or restore and publish. */
export function HistoryPanel({ page }: { page: PageDetail }) {
  const t = useT()
  const { data, isPending } = useQuery(revisionsQuery(page.id))
  if (isPending) return <Skeleton className="m-4 h-40" />
  if (!data || data.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={<History size={28} aria-hidden="true" />} title={t('history.empty')} />
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-2 p-4">
      {data.map((revision) => (
        <RevisionItem key={revision.id} page={page} revision={revision} />
      ))}
    </ul>
  )
}
