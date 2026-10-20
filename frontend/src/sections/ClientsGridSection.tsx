import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter } from '@/components/ui/Filter'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { cn } from '@/lib/cn'
import { ClientDetail } from './clients/ClientDetail'
import { GridCell } from './clients/GridCell'
import { fillCount, gridColumns, rowTicks } from './clients/grid'
import { useBreakpoint } from './clients/useBreakpoint'
import { headingId, type SectionProps } from './types'

const ALL = '__all'

/**
 * The full legend of clients: the logo wall of the home page grown into a schedule. Hairline
 * cells with number, logo, name and industry; the grid always closes with hatched cells.
 * - The industry filter (when the block enables it and there are two industries or more) is
 *   instant, every option carries its count, and the cells keep their numbers and width.
 * - A cell with a description opens a strip under its row: description and the website.
 * - The line ticks every row of the legend as it passes.
 */
export function ClientsGridSection({ section }: SectionProps<'clients_grid'>) {
  const { data } = section
  const { t } = useTranslation()
  const bp = useBreakpoint()
  const [industry, setIndustry] = useState(ALL)
  const [openId, setOpenId] = useState<string | null>(null)
  const [quick, setQuick] = useState(false)
  const cells = useRef(new Map<string, HTMLButtonElement>())
  const { clients } = data

  const industries = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    clients.forEach((c) => {
      if (!c.industry || !c.industry_label) return
      const entry = map.get(c.industry)
      if (entry) entry.count += 1
      else map.set(c.industry, { label: c.industry_label, count: 1 })
    })
    return [...map]
  }, [clients])
  const numbers = useMemo(() => new Map(clients.map((c, i) => [c.id, i + 1])), [clients])

  if (!clients.length && !data.title) return null

  const filtered = data.show_industry_filter && industries.length > 1
  const active = filtered ? industry : ALL
  const visible = active === ALL ? clients : clients.filter((c) => c.industry === active)
  const cols = gridColumns(clients.length, bp)
  const n = visible.length
  const fill = fillCount(n, cols)
  const openIndex = visible.findIndex((c) => c.id === openId)
  const open = openIndex >= 0 ? visible[openIndex] : null
  // Visual order: cell i at 3i, the hatched fillers right after the last cell, the strip
  // after the last cell (or filler) of the open row. DOM order keeps the strip next to its cell.
  const rowEnd = Math.min(n - 1, Math.floor(openIndex / cols) * cols + cols - 1)
  const detailId = `${section.id}-detail`

  const close = () => {
    const id = openId
    setOpenId(null)
    if (id) cells.current.get(id)?.focus()
  }
  const choose = (value: string) => {
    setIndustry(value)
    setQuick(true)
  }

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
      branches={n ? rowTicks : undefined}
    >
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      {!clients.length ? (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('clientsGrid.empty')}</p>
        </div>
      ) : (
        <>
          {filtered && (
            <Reveal className="mb-6 md:mb-8">
              <Filter
                label={t('clientsGrid.filter')}
                showLabel
                value={active}
                onChange={choose}
                options={[
                  { value: ALL, label: t('common.all'), count: clients.length },
                  ...industries.map(([value, { label, count }]) => ({ value, label, count })),
                ]}
              />
              <p aria-live="polite" className="sr-only">
                {t('clientsGrid.shown', { shown: n, total: clients.length })}
              </p>
            </Reveal>
          )}
          <ul
            role="list"
            className="grid border-l border-t border-line"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {visible.map((c, i) => {
              const number = numbers.get(c.id) ?? i + 1
              const isOpen = c.id === open?.id
              return [
                <GridCell
                  key={c.id}
                  ref={(el) => {
                    if (el) cells.current.set(c.id, el)
                    else cells.current.delete(c.id)
                  }}
                  client={c}
                  number={number}
                  column={i % cols}
                  tone={section.tone}
                  open={isOpen}
                  detailId={detailId}
                  onToggle={() => setOpenId(isOpen ? null : c.id)}
                  order={i * 3}
                  quick={quick}
                />,
                isOpen && (
                  <ClientDetail
                    key={`${c.id}-detail`}
                    id={detailId}
                    client={c}
                    number={number}
                    tone={section.tone}
                    order={rowEnd * 3 + 2}
                    onClose={close}
                  />
                ),
              ]
            })}
            {Array.from({ length: fill }, (_, i) => (
              <li
                key={`fill-${i}`}
                aria-hidden="true"
                style={{ order: (n - 1) * 3 + 1 }}
                className={cn(
                  'border-b border-r border-line',
                  'bg-[repeating-linear-gradient(135deg,rgb(var(--fg)/0.07)_0_1px,transparent_1px_12px)]',
                )}
              />
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}
