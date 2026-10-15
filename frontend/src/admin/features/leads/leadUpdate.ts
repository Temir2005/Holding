import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { api } from '../../api/client'
import { AdminApiError, ErrorCode } from '../../api/errors'
import { leadQuery, leadsKey, type Lead, type LeadStatus } from '../../api/leads'
import { metaOptions, type Meta } from '../../api/queries'
import { useT } from '../../i18n'
import type { Tone } from '../../ui/feedback'
import { useToast } from '../../ui/toast-context'

export const STATUS_TONE: Record<LeadStatus, Tone> = {
  new: 'info',
  in_progress: 'warning',
  done: 'success',
  spam: 'neutral',
}

export const optionLabel = (meta: Meta | undefined, list: string, value: string) =>
  metaOptions(meta, list).find((o) => o.value === value)?.label ?? value

type Page = { items: Lead[]; total: number; page: number; page_size: number }

/** Puts a saved lead into every cached list and its own query. */
function useStoreLead() {
  const queryClient = useQueryClient()
  return (saved: Lead) => {
    queryClient.setQueriesData<InfiniteData<Page>>({ queryKey: [...leadsKey, 'list'] }, (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((lead) => (lead.id === saved.id ? saved : lead)),
            })),
          }
        : data,
    )
    queryClient.setQueryData(leadQuery(saved.id).queryKey, saved)
    // The counter of new leads in the menu.
    void queryClient.invalidateQueries({ queryKey: [...leadsKey, 'new-count'] })
  }
}

/** Saves a lead's status or note with its version; a stale version reloads the leads. */
export function useLeadUpdate() {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  const store = useStoreLead()
  return useMutation({
    mutationFn: ({
      lead,
      ...changes
    }: {
      lead: Lead
      status?: LeadStatus
      manager_note?: string | null
    }) =>
      api.patch('/api/v1/admin/leads/{lead_id}', {
        path: { lead_id: lead.id },
        body: { version: lead.version, ...changes },
      }),
    onSuccess: (saved, { status }) => {
      store(saved)
      toast.success(status ? t('leads.statusSaved') : t('leads.noteSaved'))
    },
    onError: (error) => {
      if (error instanceof AdminApiError && error.code === ErrorCode.versionConflict) {
        toast.show({ tone: 'info', title: t('leads.changedMeanwhile') })
        void queryClient.invalidateQueries({ queryKey: leadsKey })
      } else toast.error(error)
    },
  })
}
