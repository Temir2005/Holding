import type { components } from '@/api/schema'
import { CountUp } from '@/components/motion/CountUp'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Reveal } from '@/components/ui/Reveal'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'
import { pad2 } from '../sectionNumber'
import { isSymbol, parseFact } from './fact'

type FactItem = components['schemas']['FactRead']

const MD = ['', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4']
const XL = ['', 'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4']

/**
 * The facts of the plant as a chain of dimensions: each figure stands on its own dimension
 * line, numbered like a callout; the figure large, the unit a small mono annotation at its top.
 */
export function Facts({
  facts,
  wide,
  className,
}: {
  facts: FactItem[]
  /** The chain has the whole sheet (no text beside it): up to four in a row. */
  wide: boolean
  className?: string
}) {
  const n = facts.length
  // Rows close evenly: four facts are two pairs, not three and one.
  const row = n === 4 ? 2 : Math.min(n, 3)
  // Tablets: the chain is under the text, full width. lg: beside the text, in pairs. xl: rows.
  const md = wide ? Math.min(n, 4) : row
  const xl = wide ? Math.min(n, 4) : row
  return (
    <ul
      className={cn(
        'grid gap-y-[clamp(32px,4vw,56px)]',
        n > 1 ? 'grid-cols-2' : 'grid-cols-1',
        MD[md],
        !wide && n > 1 && 'lg:grid-cols-2',
        XL[xl],
        className,
      )}
    >
      {facts.map((f, i) => (
        <Reveal as="li" key={`${f.value}-${i}`} delay={stagger(i)} className="min-w-0 pr-gap">
          <DimensionLine label={pad2(i + 1)} className="mb-5" />
          <p className="font-heading text-[clamp(2rem,0.9rem+2.3vw,3.5rem)] font-semibold leading-[0.9] tracking-[-0.04em]">
            <Value raw={f.value} />
          </p>
          {f.label && <p className="mt-3 max-w-[24ch] text-fg-mute">{f.label}</p>}
        </Reveal>
      ))}
    </ul>
  )
}

function Value({ raw }: { raw: string }) {
  const locale = useLocale()
  const fact = parseFact(raw)
  if (!fact) return <span className="[overflow-wrap:anywhere]">{raw}</span>
  const symbol = isSymbol(fact.tail)
  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      {fact.prefix && <span className="mr-[0.08em] font-extralight">{fact.prefix}</span>}
      <CountUp value={fact.value} format={(n) => formatNumber(n, locale)} />
      {symbol && <span className="ml-[0.04em] font-extralight">{fact.tail}</span>}
      {fact.tail && !symbol && (
        <span className="mono-label ml-[0.4em] self-start whitespace-normal font-medium leading-none tracking-[0.06em]">
          {fact.tail}
        </span>
      )}
    </span>
  )
}
