import { m, useReducedMotion } from 'framer-motion'
import type { Division } from '@/api/types'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT } from '@/lib/motion'
import { pad2 } from '../sectionNumber'

type Props = { items: Division[]; active: number; className?: string }

const OPEN = 'inset(0 0% 0 0)'
const SHUT = 'inset(0 100% 0 0)'

/**
 * The sticky frame beside the register: all covers stacked, the active one fades in while its
 * clip opens from the left; the old one fades out and its clip resets once it is invisible.
 * Reduced motion: a plain cross-fade.
 */
export function DivisionPreview({ items, active, className }: Props) {
  const reduce = useReducedMotion()
  const current = items[active]
  return (
    <div
      className={cn('sticky top-[calc(var(--header-h)+2rem)] pl-[calc(var(--gap)*1.5)]', className)}
    >
      <Frame
        caption={
          current && (
            <span aria-hidden="true" className="flex gap-4">
              <span className="text-accent">{pad2(active + 1)}</span>
              <span className="text-fg">{current.name}</span>
            </span>
          )
        }
      >
        <div
          className={cn(
            'relative w-full max-h-[calc(100svh-var(--header-h)-9rem)]',
            items.length === 1 ? 'aspect-[4/3]' : 'aspect-square',
          )}
        >
          {items.map((d, i) => {
            const on = i === active
            return (
              <m.div
                key={d.id}
                aria-hidden={!on}
                className="absolute inset-0"
                style={{ zIndex: on ? 1 : 0 }}
                initial={false}
                animate={{ opacity: on ? 1 : 0, clipPath: reduce || on ? OPEN : SHUT }}
                transition={{
                  opacity: { duration: DUR.step, ease: 'linear' },
                  clipPath: on
                    ? { duration: DUR.reveal, ease: EASE_OUT }
                    : { duration: 0, delay: DUR.step },
                }}
              >
                <SmartImage media={d.cover} fill sizes="40vw" />
              </m.div>
            )
          })}
        </div>
      </Frame>
    </div>
  )
}
