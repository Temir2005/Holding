import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Client, Tone } from '@/api/types'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT } from '@/lib/motion'
import { pad2 } from './sectionNumber'
import { headingId, type SectionProps } from './types'

/**
 * Logo on a stone tile, kept as it was for `clients_grid` (it imports it from here) until that
 * block is redesigned in its own stage.
 */
export function ClientLogo({ client }: { client: Client }) {
  return (
    <div className="tone-light flex h-24 items-center justify-center rounded-tile px-6 grayscale transition duration-300 hover:grayscale-0">
      {client.logo ? (
        <SmartImage media={client.logo} className="h-10 w-auto max-w-[12rem]" fit="contain" />
      ) : (
        <span className="font-display font-bold">{client.name}</span>
      )}
    </div>
  )
}

/** Column options per breakpoint (static class names for Tailwind). */
const MD = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as const
const LG = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
} as const

/** The column count that leaves the fewest empty cells in the last row (ties: more columns). */
function bestCols<C extends number>(n: number, options: readonly C[]): C {
  const empty = (c: number) => (c - (n % c)) % c
  return options.reduce((best, c) => (empty(c) < empty(best) ? c : best))
}

/**
 * Clients as the legend of a drawing: a wall of logos in hairline cells, monochrome until a cell
 * is hovered or focused, then the logo shows its own colours on a lit cell. The grid always closes:
 * the column count fits the number of clients, and leftover cells are hatched plates.
 */
export function ClientsMarqueeSection({ section }: SectionProps<'clients_marquee'>) {
  const { data } = section
  const { t } = useTranslation()
  const { clients } = data
  if (!clients.length && !data.title) return null

  const n = clients.length
  // A short list keeps one row (a single client sits beside two hatched cells, not alone).
  const few = n === 2 ? (2 as const) : n <= 3 ? (3 as const) : null
  const cols = {
    sm: 2,
    md: few ?? bestCols(n, [4, 3] as const),
    lg: few ?? bestCols(n, [6, 5, 4] as const),
  }
  const fill = (c: number) => (n ? (c - (n % c)) % c : 0)

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
    >
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      {n === 0 ? (
        <div className="plate grid min-h-32 place-items-center border-y border-line p-6">
          <p className="mono-label text-center">{t('clients.empty')}</p>
        </div>
      ) : (
        <ul
          role="list"
          className={cn(
            // hairlines: every cell draws its right and bottom edge, the list its top and left
            'grid border-l border-t border-line',
            n === 1 ? 'grid-cols-1' : 'grid-cols-2',
            MD[cols.md],
            LG[cols.lg],
          )}
        >
          {clients.map((c, i) => (
            <Cell key={c.id} client={c} index={i} column={i % cols.lg} tone={section.tone} />
          ))}
          <Fillers count={n === 1 ? 0 : fill(cols.sm)} className="md:hidden" />
          <Fillers count={fill(cols.md)} className="hidden md:block lg:hidden" />
          <Fillers count={fill(cols.lg)} className="hidden lg:block" />
        </ul>
      )}
    </Section>
  )
}

function Fillers({ count, className }: { count: number; className: string }) {
  return Array.from({ length: count }, (_, i) => (
    <li
      key={i}
      aria-hidden="true"
      className={cn(
        'border-b border-r border-line bg-[repeating-linear-gradient(135deg,rgb(var(--fg)/0.07)_0_1px,transparent_1px_12px)]',
        className,
      )}
    />
  ))
}

type CellProps = { client: Client; index: number; column: number; tone: Tone }

function Cell({ client, index, column, tone }: CellProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const href = client.website_url
  // The caption repeats the logo's alt when the editor wrote it that way: read it once.
  const captionHidden = !!client.logo && client.logo.alt.trim() === client.name.trim()
  const body = (
    <>
      {/* lit cell: paper under the logo so its own colours read on any tone */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10 opacity-0 transition-opacity duration-2 group-hover:opacity-100 group-focus-visible:opacity-100',
          tone === 'light' ? 'bg-surface-2' : 'bg-paper',
        )}
      />
      <span
        aria-hidden="true"
        className="mono-label tabular transition-colors duration-2 group-hover:text-carbon/60 group-focus-visible:text-carbon/60"
      >
        {pad2(index + 1)}
      </span>
      <span className="flex min-h-14 items-center justify-center py-2">
        <Logo client={client} tone={tone} />
      </span>
      <span
        aria-hidden={captionHidden || undefined}
        className={cn(
          'mono-label block transition-colors duration-2 [overflow-wrap:anywhere]',
          tone !== 'light' && 'group-hover:text-carbon group-focus-visible:text-carbon',
        )}
      >
        {client.name}
      </span>
      {href && <span className="sr-only"> · {t('common.visitSite')}</span>}
    </>
  )
  const cls =
    'group relative isolate grid h-full min-h-36 grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] gap-2 p-3 sm:p-4 md:min-h-44 md:p-5 focus-visible:outline-offset-[-3px]'
  return (
    <motion.li
      className="border-b border-r border-line"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      // rows arrive as they enter the screen, a short sweep along each row
      transition={{
        duration: reduce ? DUR.base : DUR.reveal,
        ease: EASE_OUT,
        delay: reduce ? 0 : column * 0.05,
      }}
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </motion.li>
  )
}

/**
 * Two copies of the logo, cross-faded with opacity only: a monochrome one (grey on paper, a chalk
 * or carbon silhouette on dark and red sheets) and the original colours.
 */
function Logo({ client, tone }: { client: Client; tone: Tone }) {
  if (!client.logo)
    return (
      <span className="text-center font-display text-subtitle font-semibold [overflow-wrap:anywhere] group-hover:text-carbon group-focus-visible:text-carbon">
        {client.name}
      </span>
    )
  const mono =
    tone === 'light'
      ? 'grayscale opacity-60'
      : tone === 'dark'
        ? '[filter:brightness(0)_invert(1)] opacity-60'
        : '[filter:brightness(0)] opacity-70'
  const box = 'h-8 w-auto max-w-full sm:h-10 md:h-12'
  return (
    <span className="relative inline-grid max-w-full">
      <span
        aria-hidden="true"
        className={cn(
          '[grid-area:1/1] transition-opacity duration-2 group-hover:opacity-0 group-focus-visible:opacity-0',
        )}
      >
        <SmartImage media={client.logo} fit="contain" className={cn(box, mono)} />
      </span>
      <span className="opacity-0 transition-opacity duration-2 [grid-area:1/1] group-hover:opacity-100 group-focus-visible:opacity-100">
        <SmartImage media={client.logo} fit="contain" className={box} />
      </span>
    </span>
  )
}
