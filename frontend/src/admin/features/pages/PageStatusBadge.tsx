import { pageStatus, type PageSummary } from '../../api/pages'
import { useT } from '../../i18n'
import { Badge, type Tone } from '../../ui/feedback'

const TONE = {
  live: 'success',
  changed: 'warning',
  down: 'neutral',
  never: 'info',
} as const satisfies Record<string, Tone>

export function PageStatusBadge({ page }: { page: PageSummary }) {
  const t = useT()
  const status = pageStatus(page)
  return <Badge tone={TONE[status]}>{t(`pages.status.${status}`)}</Badge>
}
