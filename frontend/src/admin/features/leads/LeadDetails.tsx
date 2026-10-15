import { useQuery } from '@tanstack/react-query'
import { Mail, Phone } from 'lucide-react'
import { useId, useState } from 'react'
import type { Lead } from '../../api/leads'
import { metaQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Textarea } from '../../ui/Input'
import { formatDate } from '../media/format'
import { LeadStatusControl } from './LeadStatusControl'
import { optionLabel, useLeadUpdate } from './leadUpdate'

const NOTE_MAX = 4000

/** Everything about one lead, its status and the manager's note (in a side panel). */
export function LeadDetails({ lead }: { lead: Lead }) {
  const t = useT()
  const noteId = useId()
  const { data: meta } = useQuery(metaQuery())
  const update = useLeadUpdate()
  const [note, setNote] = useState(lead.manager_note ?? '')
  const changed = note.trim() !== (lead.manager_note ?? '').trim()

  const rows: [string, string | null][] = [
    [t('leads.fields.date'), formatDate(lead.created_at)],
    [t('leads.fields.type'), optionLabel(meta, 'lead_types', lead.type)],
    [t('leads.fields.page'), lead.source_page],
    [t('leads.fields.locale'), lead.locale ? lead.locale.toUpperCase() : null],
  ]

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-2">
        <LeadStatusControl lead={lead} />
        <div className="flex flex-wrap gap-2">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex min-h-touch items-center gap-2 rounded border border-line-strong px-3 text-sm hover:bg-sunken md:min-h-9"
            >
              <Phone size={16} aria-hidden="true" />
              {lead.phone}
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex min-h-touch items-center gap-2 rounded border border-line-strong px-3 text-sm hover:bg-sunken md:min-h-9"
            >
              <Mail size={16} aria-hidden="true" />
              {lead.email}
            </a>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-mute">{label}</dt>
            <dd className="break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      <section className="flex flex-col gap-1.5">
        <h3 className="text-sm font-medium">{t('leads.fields.message')}</h3>
        <p className="whitespace-pre-wrap break-words rounded bg-sunken p-3 text-sm">
          {lead.message || t('leads.noMessage')}
        </p>
      </section>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          update.mutate({ lead, manager_note: note.trim() || null })
        }}
      >
        <label htmlFor={noteId} className="text-sm font-medium">
          {t('leads.fields.note')}
        </label>
        <Textarea
          id={noteId}
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('leads.notePlaceholder')}
        />
        <Button
          type="submit"
          variant="primary"
          className="self-end"
          disabled={!changed}
          loading={update.isPending && update.variables?.manager_note !== undefined}
        >
          {t('leads.saveNote')}
        </Button>
      </form>
    </div>
  )
}
