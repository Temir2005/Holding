import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode, type FieldIssue } from '../../api/errors'
import {
  pageDetailQuery,
  pagesKey,
  type SectionCreate,
  type SectionRead,
  type SectionUpdate,
} from '../../api/pages'
import { entityTypesQuery, sectionTypesQuery } from '../../api/queries'
import { rememberRefs } from '../../api/refCards'
import { VersionConflictDialog } from '../../forms/conflicts'
import { useSaveShortcut, useUnsavedGuard } from '../../forms/guards'
import { applyServerErrors } from '../../forms/schema/errors'
import { SchemaForm } from '../../forms/schema/SchemaForm'
import type { JsonSchema } from '../../forms/schema/types'
import { useSchemaForm } from '../../forms/schema/useSchemaForm'
import type { Values } from '../../forms/schema/values'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Alert, Skeleton } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'
import { blockFormSchema, blockValues, newBlockValues } from './blockForm'

const FORM_ID = 'block-editor-form'

export type BlockTarget =
  | { mode: 'edit'; section: SectionRead; issues?: FieldIssue[] }
  | { mode: 'new'; type: string; position: number }

interface FormProps {
  pageId: string
  target: BlockTarget
  schema: JsonSchema
  onClose: () => void
  onDirtyChange: (dirty: boolean) => void
}

function BlockForm({ pageId, target, schema, onClose, onDirtyChange }: FormProps) {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  const initial = useMemo(
    () => (target.mode === 'edit' ? blockValues(target.section) : newBlockValues(schema)),
    [target, schema],
  )
  const form = useSchemaForm(schema, initial)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [conflict, setConflict] = useState<Values | null>(null)
  const dirty = form.formState.isDirty

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  useUnsavedGuard(dirty)
  useSaveShortcut(() => {
    const element = document.getElementById(FORM_ID)
    if (element instanceof HTMLFormElement) element.requestSubmit()
  })

  // Problems found when publishing: shown on the fields as soon as the form opens.
  useEffect(() => {
    if (target.mode === 'edit' && target.issues?.length) {
      setFormErrors(applyServerErrors(form, schema, target.issues))
    }
  }, [target, form, schema])

  const save = useMutation({
    mutationFn: (values: Values) =>
      target.mode === 'edit'
        ? api.patch('/api/v1/admin/sections/{section_id}', {
            path: { section_id: target.section.id },
            body: { ...values, version: target.section.version } as SectionUpdate,
          })
        : api.post('/api/v1/admin/pages/{page_id}/sections', {
            path: { page_id: pageId },
            body: { ...values, type: target.type, position: target.position } as SectionCreate,
          }),
    onSuccess: (section) => {
      rememberRefs(queryClient, section.refs)
      void queryClient.invalidateQueries({ queryKey: pageDetailQuery(pageId).queryKey })
      void queryClient.invalidateQueries({ queryKey: [...pagesKey, 'list'] })
      form.reset(blockValues(section))
      toast.success(target.mode === 'edit' ? t('blocks.saved') : t('blocks.created'))
      onClose()
    },
    onError: (error, values) => {
      if (error instanceof AdminApiError && error.code === ErrorCode.versionConflict) {
        setConflict(values)
      } else if (error instanceof AdminApiError && error.fieldIssues.length > 0) {
        setFormErrors(applyServerErrors(form, schema, error.fieldIssues))
      } else {
        toast.error(error)
      }
    },
  })

  const reloadFresh = async () => {
    setConflict(null)
    if (target.mode !== 'edit') return
    const fresh = await api.get('/api/v1/admin/sections/{section_id}', {
      path: { section_id: target.section.id },
    })
    rememberRefs(queryClient, fresh.refs)
    void queryClient.invalidateQueries({ queryKey: pageDetailQuery(pageId).queryKey })
    form.reset(blockValues(fresh))
  }

  return (
    <>
      <SchemaForm
        id={FORM_ID}
        schema={schema}
        form={form}
        formErrors={formErrors}
        onSubmit={(values) => save.mutate(values)}
        className="p-4"
      >
        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-line bg-panel px-4 py-3 md:flex-row md:justify-end">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            variant="primary"
            loading={save.isPending}
            disabled={target.mode === 'edit' && !dirty}
          >
            {t('common.save')}
          </Button>
        </div>
      </SchemaForm>
      <VersionConflictDialog
        open={conflict !== null}
        edits={conflict}
        onReload={() => void reloadFresh()}
        onKeep={() => setConflict(null)}
      />
    </>
  )
}

/**
 * Content of the block editor (shown in a side panel, full screen on phones). The form is
 * built from the block type's schema; an unknown type still opens, as a JSON field.
 */
export function BlockEditor({
  pageId,
  target,
  onClose,
  onDirtyChange,
}: {
  pageId: string
  target: BlockTarget
  onClose: () => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const t = useT()
  const { data: types } = useQuery(sectionTypesQuery())
  const { data: entities } = useQuery(entityTypesQuery())
  const type = target.mode === 'edit' ? target.section.type : target.type
  const info = types?.find((s) => s.type === type)
  const envelope = entities?.find((e) => e.type === 'section')?.schema as JsonSchema | undefined
  const schema = useMemo(() => {
    if (!types || !envelope) return undefined
    // Unknown type (newer backend): the data stays editable as JSON, nothing is lost.
    const data: JsonSchema = (info?.schema as JsonSchema | undefined) ?? {
      title: t('blocks.content'),
    }
    return blockFormSchema(data, envelope, t('blocks.content'))
  }, [types, envelope, info, t])

  if (!schema) return <Skeleton className="m-4 h-64" />
  return (
    <>
      {!info && (
        <div className="px-4 pt-4">
          <Alert tone="warning">{t('blocks.unknownType', { type })}</Alert>
        </div>
      )}
      <BlockForm
        pageId={pageId}
        target={target}
        schema={schema}
        onClose={onClose}
        onDirtyChange={onDirtyChange}
      />
    </>
  )
}
