import { useTranslation } from 'react-i18next'
import type { TraceBranches } from '@/components/trace/paths'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { cn } from '@/lib/cn'
import { Facts } from './production/Facts'
import { Gallery } from './production/Gallery'
import { LEGEND_ANCHOR, Legend } from './production/Legend'
import { headingId, type SectionProps } from './types'

/** A station tick from the line to the legend caption, drawn as the pen passes it. */
const legendTick: TraceBranches = (box) =>
  (box.anchors[LEGEND_ANCHOR] ?? []).map((p) => ({
    d: `M ${box.x} ${p.y} H ${p.x - 12}`,
    at: p.y,
  }))

/**
 * The plant as a sheet of its own: the text and the facts as a chain of dimensions, the shots
 * on a contact sheet with a rhythm of proportions, then the legend of materials (sample, code,
 * name). Every part collapses when it has no data; with nothing but a heading, one line says
 * the description is coming.
 */
export function ProductionSection({ section }: SectionProps<'production'>) {
  const { data } = section
  const { t } = useTranslation()
  const { facts, gallery, swatches } = data
  const body = data.body.trim()
  const hasHeader = Boolean(data.title || data.eyebrow)
  const hasContent = Boolean(body || facts.length || gallery.length || swatches.length)
  if (!hasContent && !hasHeader) return null
  const id = headingId(section.id)

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? id : undefined}
      branches={swatches.length ? legendTick : undefined}
    >
      <SectionHeader id={id} eyebrow={data.eyebrow} title={data.title} />
      {!hasContent && <p className="mono-label">{t('production.empty')}</p>}

      <div className="flex flex-col gap-[clamp(56px,7vw,112px)]">
        {(body || facts.length > 0) && (
          <div className="grid grid-cols-12 gap-x-gap gap-y-12">
            {body && (
              <Reveal className={cn('col-span-12', facts.length > 0 && 'lg:col-span-5')}>
                <p className="max-w-[40ch] text-lead text-fg-mute">{body}</p>
              </Reveal>
            )}
            {facts.length > 0 && (
              <Facts
                facts={facts}
                wide={!body}
                className={cn('col-span-12', body && 'lg:col-span-6 lg:col-start-7')}
              />
            )}
          </div>
        )}

        {gallery.length > 0 && <Gallery items={gallery} />}
        {swatches.length > 0 && <Legend swatches={swatches} />}
      </div>
    </Section>
  )
}
