import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { AdminApiError } from '../../api/errors'
import { pagesKey } from '../../api/pages'
import { entityTypesQuery } from '../../api/queries'
import { applyServerErrors } from '../../forms/schema/errors'
import { SchemaForm } from '../../forms/schema/SchemaForm'
import type { JsonSchema } from '../../forms/schema/types'
import { useSchemaForm } from '../../forms/schema/useSchemaForm'
import { emptyForm, type Values } from '../../forms/schema/values'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Skeleton } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'

/** The page form narrowed to what a new page needs: its address and title. */
function creationSchema(page: JsonSchema): JsonSchema {
  const keep = ['slug', 'title']
  return {
    ...page,
    properties: Object.fromEntries(
      Object.entries(page.properties ?? {}).filter(([key]) => keep.includes(key)),
    ),
    required: keep,
  }
}

function NewPageForm({ schema, onDone }: { schema: JsonSchema; onDone: () => void }) {
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useSchemaForm(schema, emptyForm(schema))
  const [formErrors, setFormErrors] = useState<string[]>([])

  const create = useMutation({
    mutationFn: (values: Values) =>
      api.post('/api/v1/admin/pages', {
        body: values as { slug: string; title: { ru: string } },
      }),
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: pagesKey })
      toast.success(t('pages.created'))
      onDone()
      navigate(`/admin/pages/${page.id}`)
    },
    onError: (error) => {
      if (error instanceof AdminApiError && error.fieldIssues.length > 0) {
        setFormErrors(applyServerErrors(form, schema, error.fieldIssues))
      } else if (error instanceof AdminApiError && error.code === 'ALREADY_EXISTS') {
        form.setError('slug', { type: 'server', message: error.message })
      } else {
        toast.error(error)
      }
    },
  })

  return (
    <SchemaForm
      schema={schema}
      form={form}
      formErrors={formErrors}
      onSubmit={(v) => create.mutate(v)}
    >
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button onClick={onDone}>{t('common.cancel')}</Button>
        <Button type="submit" variant="primary" loading={create.isPending}>
          {t('pages.create')}
        </Button>
      </div>
    </SchemaForm>
  )
}

export function NewPageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const t = useT()
  const { data: entityTypes } = useQuery(entityTypesQuery())
  const pageSchema = entityTypes?.find((e) => e.type === 'page')?.schema as JsonSchema | undefined
  const schema = useMemo(() => (pageSchema ? creationSchema(pageSchema) : undefined), [pageSchema])
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('pages.new')}>
      {schema && open ? (
        <NewPageForm schema={schema} onDone={() => onOpenChange(false)} />
      ) : (
        <Skeleton className="h-40" />
      )}
    </Dialog>
  )
}
