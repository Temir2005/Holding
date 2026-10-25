import { useTranslation } from 'react-i18next'
import type { ProjectCard as Card } from '@/api/types'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'

export const STATUS_COLOR: Record<Card['status'], string> = {
  completed: '#2E9E5B',
  in_progress: 'var(--bar)',
  planned: '#8A8D92',
}

/** Location · year · area, whatever the project has. */
export function useProjectMeta() {
  const { t } = useTranslation()
  const locale = useLocale()
  return (p: Card) =>
    [
      p.location,
      p.year ? (p.status === 'completed' ? String(p.year) : t('ui.dueIn', { year: p.year })) : null,
      p.area_m2 ? `${formatNumber(p.area_m2, locale)} ${t('project.sqm')}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
}
