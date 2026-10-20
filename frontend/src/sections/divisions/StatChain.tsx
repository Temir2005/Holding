import type { Division } from '@/api/types'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'

/**
 * Facts of a division as a chain of dimensions: the segments share their end ticks, the value
 * sits over the line and the label under it, like a run of sizes along a wall on a drawing.
 */
export function StatChain({ stats, className }: { stats: Division['stats']; className?: string }) {
  const locale = useLocale()
  return (
    <dl className={cn('flex flex-wrap gap-y-6', className)}>
      {stats.map((s, i) => (
        <div key={`${s.label}-${i}`} className="flex w-[15rem] max-w-[50%] flex-col">
          <dt className="order-3 mono-label mt-3 pr-4 [overflow-wrap:break-word]">{s.label}</dt>
          <dd className="order-1 tabular whitespace-nowrap pb-3 pr-4 text-[clamp(1.5rem,1.1rem+1vw,2.25rem)] font-light leading-none tracking-[-0.03em]">
            {formatNumber(s.value, locale)}
            {s.suffix && <span className="ml-[0.12em] text-[0.62em] text-fg-mute">{s.suffix}</span>}
          </dd>
          {/* |———|———| the segment: line with a tick at the start (and at the end on the last) */}
          <span aria-hidden="true" className="relative order-2 block h-[11px] text-line-strong">
            <span className="absolute inset-x-0 top-[5px] h-px bg-current" />
            <span className="absolute left-0 top-0 h-full w-px bg-current" />
            <span
              className={cn(
                'absolute right-0 top-0 h-full w-px bg-current',
                i < stats.length - 1 && 'hidden',
              )}
            />
          </span>
        </div>
      ))}
    </dl>
  )
}
