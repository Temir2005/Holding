import * as Tabs from '@radix-ui/react-tabs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, History, MoreVertical, RotateCcw, Send, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { AdminApiError, type FieldIssue } from '../../api/errors'
import {
  blockTitle,
  canPublish,
  pageDetailQuery,
  pagesKey,
  pageTitle,
  type PageDetail,
} from '../../api/pages'
import { sectionTypesQuery } from '../../api/queries'
import { rememberRefs } from '../../api/refCards'
import { useT } from '../../i18n'
import { BREAKPOINTS, useMediaQuery } from '../../layout/useMediaQuery'
import { Button } from '../../ui/Button'
import { useConfirm } from '../../ui/confirm-context'
import { Sheet } from '../../ui/Dialog'
import { EmptyState, Skeleton } from '../../ui/feedback'
import { IconButton } from '../../ui/IconButton'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../ui/Menu'
import { useToast } from '../../ui/toast-context'
import { AdminNotFound } from '../Placeholder'
import { AddBlockDialog } from './AddBlockDialog'
import { BlockEditor, type BlockTarget } from './BlockEditor'
import { BlocksPanel } from './BlocksPanel'
import { HistoryPanel } from './HistoryPanel'
import { PageSettingsForm } from './PageSettingsForm'
import { PageStatusBadge } from './PageStatusBadge'
import { PreviewPane } from './PreviewPane'
import { PublishDialog } from './PublishDialog'
import { useCloseGuard } from './useCloseGuard'

const tabClass =
  'min-h-touch border-b-2 border-transparent px-3 text-sm text-mute data-[state=active]:border-accent data-[state=active]:font-medium data-[state=active]:text-fg md:min-h-10'

function PageActions({
  page,
  onPublish,
  onHistory,
}: {
  page: PageDetail
  onPublish: () => void
  onHistory: () => void
}) {
  const t = useT()
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: pageDetailQuery(page.id).queryKey })
    void queryClient.invalidateQueries({ queryKey: [...pagesKey, 'list'] })
  }

  const action = useMutation({
    mutationFn: (kind: 'discard' | 'unpublish') =>
      kind === 'discard'
        ? api.post('/api/v1/admin/pages/{page_id}/discard-draft', {
            path: { page_id: page.id },
            body: { version: page.version },
          })
        : api.post('/api/v1/admin/pages/{page_id}/unpublish', {
            path: { page_id: page.id },
            body: { version: page.version },
          }),
    onSuccess: (_r, kind) => {
      refresh()
      toast.success(kind === 'discard' ? t('publish.discarded') : t('publish.unpublished'))
    },
    onError: (error) => {
      if (error instanceof AdminApiError) refresh()
      toast.error(error)
    },
  })

  const ask = async (kind: 'discard' | 'unpublish') => {
    const ok = await confirm({
      title: kind === 'discard' ? t('publish.discardTitle') : t('publish.unpublishTitle'),
      description: kind === 'discard' ? t('publish.discardText') : t('publish.unpublishText'),
      confirmLabel: kind === 'discard' ? t('publish.discard') : t('publish.unpublish'),
      danger: true,
    })
    if (ok) action.mutate(kind)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        icon={<Send size={16} aria-hidden="true" />}
        disabled={!canPublish(page)}
        onClick={onPublish}
      >
        {t('publish.action')}
      </Button>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            label={t('publish.more')}
            icon={<MoreVertical size={16} aria-hidden="true" />}
          />
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={<History size={16} />} onSelect={onHistory}>
            {t('publish.history')}
          </MenuItem>
          {page.published_revision_number !== null && page.has_unpublished_changes && (
            <MenuItem icon={<RotateCcw size={16} />} onSelect={() => void ask('discard')}>
              {t('publish.discard')}
            </MenuItem>
          )}
          {page.is_published && (
            <MenuItem icon={<Undo2 size={16} />} onSelect={() => void ask('unpublish')} danger>
              {t('publish.unpublish')}
            </MenuItem>
          )}
        </MenuContent>
      </Menu>
    </div>
  )
}

function Editor({ page }: { page: PageDetail }) {
  const t = useT()
  const wide = useMediaQuery(BREAKPOINTS.xl)
  const queryClient = useQueryClient()
  const { data: types } = useQuery(sectionTypesQuery())
  const [tab, setTab] = useState('blocks')
  const [target, setTarget] = useState<BlockTarget | null>(null)
  const [addAt, setAddAt] = useState<number | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [history, setHistory] = useState(false)
  const [preview, setPreview] = useState(false)
  const [settingsIssues, setSettingsIssues] = useState<FieldIssue[] | undefined>()
  const [blockDirty, setBlockDirty] = useState(false)

  // Cards of everything the blocks reference: reference fields show names at once.
  useEffect(() => {
    for (const section of page.sections) rememberRefs(queryClient, section.refs)
  }, [page.sections, queryClient])

  const closeBlock = useCallback(() => {
    setTarget(null)
    setBlockDirty(false)
  }, [])
  const guardedClose = useCloseGuard(blockDirty, closeBlock)

  const blockTitleText = (() => {
    if (!target) return ''
    const type = target.mode === 'edit' ? target.section.type : target.type
    const label = types?.find((s) => s.type === type)?.label ?? type
    if (target.mode === 'new') return t('blocks.newTitle', { type: label })
    return blockTitle(target.section.data) ? `${label}: ${blockTitle(target.section.data)}` : label
  })()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Link
          to="/admin/pages"
          className="inline-flex min-h-touch items-center gap-1 self-start text-sm text-mute hover:text-fg md:min-h-8"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('pages.back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl md:text-2xl">{pageTitle(page)}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <PageStatusBadge page={page} />
              <span className="font-mono text-xs text-mute">/{page.slug}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!wide && (
              <Button icon={<Eye size={16} aria-hidden="true" />} onClick={() => setPreview(true)}>
                {t('preview.open')}
              </Button>
            )}
            <PageActions
              page={page}
              onPublish={() => setPublishing(true)}
              onHistory={() => setHistory(true)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Tabs.Root value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-4">
          <Tabs.List aria-label={pageTitle(page)} className="flex border-b border-line">
            <Tabs.Trigger value="blocks" className={tabClass}>
              {t('pages.tabs.blocks')}
            </Tabs.Trigger>
            <Tabs.Trigger value="settings" className={tabClass}>
              {t('pages.tabs.settings')}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="blocks">
            <BlocksPanel
              page={page}
              onEdit={(section) => setTarget({ mode: 'edit', section })}
              onAdd={(position) => setAddAt(position)}
            />
          </Tabs.Content>
          <Tabs.Content value="settings">
            <PageSettingsForm page={page} issues={settingsIssues} />
          </Tabs.Content>
        </Tabs.Root>
        {wide && (
          <PreviewPane
            page={page}
            className="sticky top-[calc(theme(spacing.topbar)+1rem)] h-[calc(100dvh-theme(spacing.topbar)-2rem)]"
          />
        )}
      </div>

      <Sheet
        open={target !== null}
        onOpenChange={(open) => !open && void guardedClose()}
        title={blockTitleText}
        size="wide"
      >
        {target && (
          <BlockEditor
            key={
              target.mode === 'edit'
                ? `${target.section.id}-${target.section.version}`
                : `new-${target.type}`
            }
            pageId={page.id}
            target={target}
            onClose={closeBlock}
            onDirtyChange={setBlockDirty}
          />
        )}
      </Sheet>
      <AddBlockDialog
        open={addAt !== null}
        onOpenChange={(open) => !open && setAddAt(null)}
        onChoose={(type) => {
          setTarget({ mode: 'new', type, position: addAt ?? page.sections.length })
          setAddAt(null)
        }}
      />
      <PublishDialog
        page={page}
        open={publishing}
        onOpenChange={setPublishing}
        onGoTo={(group) => {
          if (group.section) {
            setTab('blocks')
            setTarget({ mode: 'edit', section: group.section, issues: group.issues })
          } else {
            setTab('settings')
            setSettingsIssues(group.issues)
          }
        }}
      />
      <Sheet open={history} onOpenChange={setHistory} title={t('history.title')}>
        {history && <HistoryPanel page={page} />}
      </Sheet>
      {!wide && (
        <Sheet open={preview} onOpenChange={setPreview} title={t('preview.title')} size="wide">
          {preview && <PreviewPane page={page} className="h-full rounded-none border-0" />}
        </Sheet>
      )}
    </div>
  )
}

/** One page: its blocks, settings and SEO, publishing, history and preview. */
export function PageEditorPage() {
  const { pageId = '' } = useParams()
  const t = useT()
  const { data: page, isPending, error } = useQuery(pageDetailQuery(pageId))
  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (error instanceof AdminApiError && error.status === 404) return <AdminNotFound />
  if (!page) return <EmptyState title={t('errors.loadFailed')} />
  return <Editor page={page} />
}
