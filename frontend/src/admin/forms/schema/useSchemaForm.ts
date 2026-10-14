import { useMemo } from 'react'
import { useForm, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { schemaResolver } from './errors'
import type { JsonSchema } from './types'
import type { Values } from './values'

/** react-hook-form set up for a schema: client checks run on submit, then on change. */
export function useSchemaForm(schema: JsonSchema, values: Values): UseFormReturn<FieldValues> {
  const resolver = useMemo(() => schemaResolver(schema), [schema])
  return useForm<FieldValues>({
    defaultValues: values,
    resolver,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
}
