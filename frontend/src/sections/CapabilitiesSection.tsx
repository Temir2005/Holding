import { useTranslation } from 'react-i18next'
import type { components } from '@/api/schema'
import { ClipReveal } from '@/components/motion/ClipReveal'
import type { TraceBranches } from '@/components/trace/paths'
import { Frame } from '@/components/ui/Frame'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'
import { pad2 } from './sectionNumber'
import { headingId, type SectionProps } from './types'

type Item = components['schemas']['IconItemRead']
type Cols = 1 | 2 | 3 | 4

/** Anchor of the row numbers: the line marks every row of the table with a tick. */
const ROW_ANCHOR = 'capability-row'

/** A short tick across the line at every row (cells of one row share the y), drawn by the pen. */
const rowTicks: TraceBranches = (box) => {
  const ys = new Set((box.anchors[ROW_ANCHOR] ?? []).map((p) => p.y))
  return [...ys]
    .filter((y) => y > 0 && y < box.h)
    .map((y) => ({ d: `M ${box.x - 5} ${y} H ${box.x + 6}`, at: y }))
}

const LG_COLS: Record<Cols, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
}

/** Column rules of the table: every cell but the first of its row has a hairline on the left. */
const LG_RULE: Record<Cols, string> = {
  1: '',
  2: 'lg:[&:nth-child(2n)]:border-l lg:[&:nth-child(2n)]:pl-gap',
  3: 'lg:[&:not(:nth-child(3n+1))]:border-l lg:[&:not(:nth-child(3n+1))]:pl-gap',
  4: 'lg:[&:not(:nth-child(4n+1))]:border-l lg:[&:not(:nth-child(4n+1))]:pl-gap',
}
const MD_RULE = 'md:max-lg:[&:nth-child(2n)]:border-l md:max-lg:[&:nth-child(2n)]:pl-gap'

/**
 * Advantages, products, audiences as a specification of a drawing, not icon cards:
 * - rows of a table with hairlines, the number and a small mono mark of the icon in the first
 *   column, the title and the text; an item's photo becomes a frame inside its row;
 * - when every item has a photo (samples of finishes): a grid of frames with captions.
 * `data.columns` sets the columns on wide screens (two on tablets, one on phones); fewer items
 * than columns take what they need, a single item is one wide row.
 */
export function CapabilitiesSection({ section }: SectionProps<'capabilities'>) {
  const { data } = section
  const { t } = useTranslation()
  const items = data.items
  const hasHeader = Boolean(data.title || data.eyebrow || data.intro)
  if (!items.length && !hasHeader) return null
  const cols = Math.max(1, Math.min(data.columns, items.length)) as Cols
  const frames = items.length > 0 && items.every((i) => i.media)
  const id = headingId(section.id)

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? id : undefined}
      branches={items.length ? rowTicks : undefined}
    >
      <SectionHeader id={id} eyebrow={data.eyebrow} title={data.title} intro={data.intro} />
      {!items.length ? (
        <p className="mono-label">{t('capabilities.empty')}</p>
      ) : frames ? (
        <FrameGrid items={items} cols={cols} />
      ) : (
        <SpecTable items={items} cols={cols} />
      )}
    </Section>
  )
}

function Mark({ index, icon, inline }: { index: number; icon: string; inline?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-start gap-3',
        inline ? 'max-md:items-center md:flex-col' : 'flex-col',
      )}
    >
      <span
        data-trace-anchor={ROW_ANCHOR}
        className="tabular font-mono text-caption font-medium text-fg"
      >
        {pad2(index + 1)}
      </span>
      <Icon name={icon} className="h-4 w-4 text-fg-mute" />
    </span>
  )
}

function SpecTable({ items, cols }: { items: Item[]; cols: Cols }) {
  const n = items.length
  const lgFill = (cols - (n % cols)) % cols
  const mdFill = cols >= 2 ? n % 2 : 0
  const cell = cn(
    'border-t border-line pb-[clamp(32px,3vw,48px)] pt-6 md:pr-gap',
    cols >= 2 && MD_RULE,
    LG_RULE[cols],
  )
  return (
    <ul
      className={cn(
        'grid grid-cols-1 border-b border-line',
        cols >= 2 && 'md:grid-cols-2',
        LG_COLS[cols],
      )}
    >
      {items.map((item, i) => (
        <Reveal as="li" key={`${item.title}-${i}`} delay={stagger(i % 4)} className={cell}>
          <div
            className={cn(
              'grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-3',
              cols === 1 &&
                'md:grid-cols-[3rem_minmax(0,5fr)_minmax(0,6fr)] md:gap-x-gap lg:grid-cols-[4rem_minmax(0,4fr)_minmax(0,5fr)_minmax(0,3fr)]',
            )}
          >
            <div className="row-span-3">
              <Mark index={i} icon={item.icon} />
            </div>
            {item.media && (
              <div
                className={cn(
                  'mb-3 max-w-[22rem]',
                  cols === 1 && 'md:col-start-3 md:mb-0 lg:col-start-4 lg:row-span-2',
                )}
              >
                <Frame>
                  <SmartImage
                    media={item.media}
                    crop
                    className="aspect-[4/3]"
                    sizes="(min-width: 1024px) 22rem, 70vw"
                  />
                </Frame>
              </div>
            )}
            <h3
              className={cn(
                'max-w-[22ch] text-subtitle font-semibold [overflow-wrap:break-word]',
                cols === 1 && 'md:col-start-2 md:row-start-1',
              )}
            >
              {item.title}
            </h3>
            {item.text && (
              <p
                className={cn(
                  'max-w-[40ch] text-fg-mute [overflow-wrap:break-word]',
                  cols === 1 && 'md:col-start-3 md:row-start-1 lg:col-start-3',
                )}
              >
                {item.text}
              </p>
            )}
          </div>
        </Reveal>
      ))}
      {/* empty cells close the last row of the table, so its rules run to the edge */}
      {Array.from({ length: mdFill }, (_, i) => (
        <li
          key={`md-${i}`}
          aria-hidden="true"
          className="hidden border-l border-t border-line md:block lg:hidden"
        />
      ))}
      {Array.from({ length: lgFill }, (_, i) => (
        <li
          key={`lg-${i}`}
          aria-hidden="true"
          className="hidden border-l border-t border-line lg:block"
        />
      ))}
    </ul>
  )
}

/** Every item has a photo: a sheet of framed samples, each with a numbered caption. */
function FrameGrid({ items, cols }: { items: Item[]; cols: Cols }) {
  const solo = cols === 1
  return (
    <ul
      className={cn(
        'grid grid-cols-1 gap-x-gap gap-y-8 md:gap-y-[clamp(48px,5vw,80px)]',
        !solo && 'md:grid-cols-2',
        !solo && LG_COLS[cols],
      )}
    >
      {items.map((item, i) => (
        <li
          key={`${item.title}-${i}`}
          // phones: a row of the specification, the sample small on the left
          className={cn(
            'grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-x-4',
            solo ? 'md:grid-cols-12 md:items-end md:gap-x-gap' : 'md:block',
          )}
        >
          <Frame className={cn(solo && 'md:col-span-7')}>
            <ClipReveal from="left" delay={stagger(i % 4)}>
              <SmartImage
                media={item.media}
                crop
                className="aspect-[4/3]"
                sizes={
                  solo
                    ? '(min-width: 768px) 55vw, 100vw'
                    : `(min-width: 1024px) ${Math.round(90 / cols)}vw, (min-width: 768px) 45vw, 100vw`
                }
              />
            </ClipReveal>
          </Frame>
          <Reveal
            delay={stagger(i % 4)}
            className={cn(
              'grid gap-y-2 border-t border-line pt-3 md:mt-6 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-x-4 md:gap-y-0 md:pt-4',
              solo && 'md:col-span-4 md:col-start-9 md:mt-0',
            )}
          >
            <div className="md:row-span-2">
              <Mark index={i} icon={item.icon} inline />
            </div>
            <h3 className="text-[1.125rem] font-semibold leading-snug [overflow-wrap:break-word] md:text-[1.25rem]">
              {item.title}
            </h3>
            {item.text && (
              <p className="mt-1 max-w-[36ch] text-[0.9375rem] leading-normal text-fg-mute [overflow-wrap:break-word]">
                {item.text}
              </p>
            )}
          </Reveal>
        </li>
      ))}
    </ul>
  )
}
