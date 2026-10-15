import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useWatch, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { metaOptions, metaQuery } from '../../api/queries'
import type { CollectionConfig } from './config'

/** Nothing typed: no value, or a localized text with every language empty. */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value).every((v) => typeof v !== 'string' || v.trim() === '')
  }
  return false
}

/**
 * Fills an empty field from a suggestion chosen in another one (the client industry name
 * from the industry key, `CollectionConfig.prefill`). What the editor typed is never replaced.
 */
export function usePrefill(config: CollectionConfig, form: UseFormReturn<FieldValues>) {
  const prefill = config.prefill
  const { data: meta } = useQuery(metaQuery())
  const key: unknown = useWatch({ control: form.control, name: prefill?.from ?? '' })
  const suggested =
    prefill !== undefined &&
    typeof key === 'string' &&
    metaOptions(meta, prefill.list).some((o) => o.value === key)

  useEffect(() => {
    if (!prefill || !suggested || typeof key !== 'string') return
    if (!isBlank(form.getValues(prefill.to))) return
    let current = true
    void prefill.value(key).then(
      (value) => {
        if (current && !isBlank(value) && isBlank(form.getValues(prefill.to))) {
          form.setValue(prefill.to, value, { shouldDirty: true })
        }
      },
      // A hint only: the editor can still type the name.
      () => undefined,
    )
    return () => {
      current = false
    }
  }, [prefill, suggested, key, form])
}
