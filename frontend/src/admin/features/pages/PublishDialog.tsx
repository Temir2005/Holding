import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode } from '../../api/errors'
import {
  blockTitle,
  pageDetailQuery,
  pagesKey,
  type PageDetail,
  type SectionRead,
} from '../../api/pages'
import { sectionTypesQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { groupProblems, type ProblemGroup } from './publishProblems'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Alert } from '../../ui/feedback'
import { Textarea } from '../../ui/Input'
import { useToast } from '../../ui/toast-context'

interface PublishDialogProps {
  page: PageDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onGoTo: (group: ProblemGroup) => void
}

export function PublishDialog({ page, open, onOpenChange, onGoTo }: PublishDialogProps) {
  const t = useT()
  const toast = useToast()
  const commentId = useId()
  const queryClient = useQueryClient()
  const { data: types } = useQuery(sectionTypesQuery())
  const [comment, setComment] = useState('')
  const [problems, setProblems] = useState<ProblemGroup[] | null>(null)
  const [draftChanged, setDraftChanged] = useState(false)
  const labelOf = (section: SectionRead) =>
    blockTitle(section.data) || types?.find((s) => s.type === section.type)?.label || section.type

  const close = () => {
    setComment('')
    setProblems(null)
    setDraftChanged(false)
    onOpenChange(false)
  }

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: pageDetailQuery(page.id).queryKey })
    void queryClient.invalidateQueries({ queryKey: [...pagesKey, 'list'] })
    void queryClient.invalidateQueries({ queryKey: [...pagesKey, 'revisions', page.id] })
  }

  const publish = useMutation({
    mutationFn: () =>
      api.post('/api/v1/admin/pages/{page_id}/publish', {
        path: { page_id: page.id },
        body: {
          version: page.version,
          draft_hash: page.draft_hash,
          comment: comment.trim() || null,
        },
      }),
    onSuccess: (result) => {
      refresh()
      toast.success(
        page.has_unpublished_changes || !result.is_published
          ? t('publish.done')
          : t('publish.returned'),
      )
      close()
    },
    onError: (error) => {
      if (!(error instanceof AdminApiError)) return toast.error(error)
      if (error.fieldIssues.length > 0) setProblems(groupProblems(page, error.fieldIssues))
      else if (error.code === 'DRAFT_CHANGED' || error.code === ErrorCode.versionConflict)
        setDraftChanged(true)
      else if (error.code === 'NO_CHANGES') {
        toast.show({ tone: 'info', title: t('publish.upToDate') })
        refresh()
        close()
      } else toast.error(error)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={t('publish.title')}
      description={t('publish.text')}
      footer={
        <>
          <Button onClick={close}>{t('common.cancel')}</Button>
          {draftChanged ? (
            <Button
              variant="primary"
              onClick={() => {
                refresh()
                close()
              }}
            >
              {t('publish.reload')}
            </Button>
          ) : (
            <Button variant="primary" loading={publish.isPending} onClick={() => publish.mutate()}>
              {t('publish.submit')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {draftChanged && <Alert tone="warning">{t('publish.draftChanged')}</Alert>}
        {problems && (
          <Alert tone="danger" title={t('publish.problems')}>
            <ul className="flex flex-col gap-2">
              {problems.map((group, i) => (
                <li key={group.section?.id ?? `page-${i}`} className="flex flex-col gap-1">
                  <span className="font-medium">
                    {group.section ? labelOf(group.section) : t('publish.pageField')}
                  </span>
                  <ul className="list-disc pl-5">
                    {group.issues.map((issue, j) => (
                      <li key={j}>{issue.msg}</li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      close()
                      onGoTo(group)
                    }}
                  >
                    {t('publish.goTo')}
                  </Button>
                </li>
              ))}
            </ul>
          </Alert>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={commentId} className="text-sm font-medium">
            {t('publish.comment')}
          </label>
          <Textarea
            id={commentId}
            rows={2}
            maxLength={500}
            value={comment}
            aria-describedby={`${commentId}-hint`}
            onChange={(e) => setComment(e.target.value)}
          />
          <p id={`${commentId}-hint`} className="text-xs text-mute">
            {t('publish.commentHint')}
          </p>
        </div>
      </div>
    </Dialog>
  )
}
