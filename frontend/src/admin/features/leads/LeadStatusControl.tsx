import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { NEXT_STATUS, type Lead, type LeadStatus } from '../../api/leads'
import { metaOptions, metaQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/feedback'
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '../../ui/Menu'
import { optionLabel, STATUS_TONE, useLeadUpdate } from './leadUpdate'

/**
 * The status of a lead: the next step in one click ("Взять в работу", "Обработана") and any
 * status from the menu.
 */
export function LeadStatusControl({ lead }: { lead: Lead }) {
  const t = useT()
  const { data: meta } = useQuery(metaQuery())
  const update = useLeadUpdate()
  const next = NEXT_STATUS[lead.status]
  const busy = update.isPending
  const set = (status: LeadStatus) => {
    if (status !== lead.status) update.mutate({ lead, status })
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            disabled={busy}
            aria-label={t('leads.changeStatus', {
              status: optionLabel(meta, 'lead_statuses', lead.status),
              name: lead.name,
            })}
            className="inline-flex min-h-touch items-center gap-1 rounded md:min-h-8"
          >
            <Badge tone={STATUS_TONE[lead.status]}>
              {optionLabel(meta, 'lead_statuses', lead.status)}
              <ChevronDown size={12} aria-hidden="true" />
            </Badge>
          </button>
        </MenuTrigger>
        <MenuContent align="start">
          <MenuRadioGroup value={lead.status} onValueChange={(v) => set(v as LeadStatus)}>
            {metaOptions(meta, 'lead_statuses').map((o) => (
              <MenuRadioItem key={o.value} value={o.value}>
                {o.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
      {next && (
        <Button size="sm" loading={busy} onClick={() => set(next)}>
          {t(`leads.next.${next}`)}
        </Button>
      )}
    </span>
  )
}
