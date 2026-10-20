import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '@/api/types'
import { usePageSheet } from '@/components/layout/usePageSheet'
import { StatusMark } from '@/components/ui/StatusMark'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'
import { pad2 } from '@/sections/sectionNumber'
import { Area } from '@/sections/showcase/parts'

type Cell = { key: string; label: string; value: ReactNode; wide?: boolean }

/**
 * The title block of the project sheet: only the filled figures (status, year, area, division,
 * location, tokenization), two cells to a row, a lonely half cell stretched so every row closes,
 * and the page sheet «Лист / Листов» in the bottom row.
 */
export function ProjectStamp({ project: p, className }: { project: Project; className?: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const sheet = usePageSheet()

  const cells: Cell[] = [
    { key: 'status', label: t('project.status'), value: <StatusMark status={p.status} /> },
  ]
  if (p.year != null)
    cells.push({
      key: 'year',
      label: t('project.year'),
      value: <span className="tabular">{p.year}</span>,
    })
  if (p.area_m2 != null)
    cells.push({
      key: 'area',
      label: t('project.area'),
      value: (
        <span className="tabular whitespace-nowrap">
          <Area value={p.area_m2} locale={locale} />
        </span>
      ),
    })
  if (p.is_tokenized)
    cells.push({ key: 'token', label: t('projectPage.tokenization'), value: t('projectPage.yes') })
  if (p.division)
    cells.push({
      key: 'division',
      label: t('project.division'),
      value: p.division.name,
      wide: true,
    })
  if (p.location)
    cells.push({ key: 'location', label: t('project.location'), value: p.location, wide: true })
  closeRows(cells)

  return (
    // Cells draw their right and bottom hairlines; the last ones slip under the clipped edge.
    <div className={cn('overflow-hidden border border-line-strong', className)}>
      <p className="mono-label border-b border-line-strong px-3 py-2.5 text-fg">
        {t('projectPage.spec')}
      </p>
      <dl className="-mb-px -mr-px grid grid-cols-2">
        {cells.map((c) => (
          <StampCell key={c.key} label={c.label} wide={c.wide}>
            {c.value}
          </StampCell>
        ))}
      </dl>
      {sheet && (
        <dl className="-mb-px -mr-px grid grid-cols-2 border-t border-line-strong">
          <StampCell label={t('sheet.sheet')} mono>
            {sheet.number ? pad2(sheet.number) : t('sheet.noNumber')}
          </StampCell>
          <StampCell label={t('sheet.sheets')} mono>
            {pad2(sheet.total)}
          </StampCell>
        </dl>
      )}
    </div>
  )
}

/** A half cell left alone in its row (before a wide one or at the end) takes the full row. */
function closeRows(cells: Cell[]) {
  let half = 0
  cells.forEach((c, i) => {
    if (c.wide) return
    half += 1
    const next = cells[i + 1]
    if (half % 2 === 1 && (!next || next.wide)) {
      c.wide = true
      half = 0
    }
  })
}

function StampCell({
  label,
  children,
  wide,
  mono,
}: {
  label: string
  children: ReactNode
  wide?: boolean
  mono?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1.5 border-b border-r border-line px-3 py-2.5',
        wide && 'col-span-2',
      )}
    >
      <dt className="mono-label">{label}</dt>
      <dd
        className={cn(
          '[overflow-wrap:anywhere]',
          mono ? 'tabular font-mono text-[0.8125rem] font-medium' : 'text-[0.9375rem] font-medium',
        )}
      >
        {children}
      </dd>
    </div>
  )
}
