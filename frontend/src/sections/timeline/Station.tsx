import { m, useInView, useReducedMotion } from 'framer-motion'
import { forwardRef, useRef } from 'react'
import type { TimelineEvent } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT, PEN } from '@/lib/motion'

type Props = {
  event: TimelineEvent
  index: number
  count: number
  /** "3 года" to the next event, or null for the last one (or two events in one year). */
  interval: string | null
}

/** In-view margin that puts the bottom edge of the viewport at the pen height. */
const AT_PEN = `0px 0px ${parseFloat(PEN) - 100}% 0px` as const

/**
 * One event: a station on the line in the margin with a leader into the year, the year, the
 * text and the frame, on the 12 columns (year 1–4, text 5–8, frame 9–12).
 * The section's line is straight, so its tip is always at the pen height: the station lights
 * when it crosses the pen, exactly when the line reaches it.
 */
export function Station({ event, index, count, interval }: Props) {
  const reduce = useReducedMotion()
  const mark = useRef<HTMLSpanElement>(null)
  const reached = useInView(mark, { once: true, margin: AT_PEN })
  const lit = Boolean(reduce) || reached
  const now = index === count - 1
  const dense = count > 6
  // Frames widen from the first event to the last: the history reads as growth.
  const min = dense ? 0.4 : 0.55
  const width = count > 1 ? min + ((1 - min) * index) / (count - 1) : 1
  // Space to the next row; the interval dimension stretches through it.
  const gap = now ? '' : dense ? 'md:pb-12' : 'md:pb-20'
  const gapLg = now ? '' : dense ? 'lg:pb-12' : 'lg:pb-20'

  return (
    <li
      className={cn(
        'relative grid grid-cols-1 md:grid-cols-12 md:grid-rows-[auto_minmax(0,1fr)] md:gap-x-gap',
        !now && !interval && 'pb-16 md:pb-0',
      )}
    >
      <p
        className={cn(
          'relative self-start md:col-span-4 md:col-start-1 md:row-start-1',
          'tabular text-[4.5rem] font-extralight leading-[0.82] tracking-[-0.05em] md:text-stat-lg',
          now && 'text-accent',
        )}
      >
        <StationMark ref={mark} lit={lit} now={now} />
        <m.span
          className="block"
          initial={false}
          animate={{ opacity: lit ? 1 : 0.3 }}
          transition={{ duration: DUR.reveal, ease: EASE_OUT }}
        >
          {event.year}
        </m.span>
      </p>

      <Reveal
        className={cn(
          'mt-5 flex flex-col gap-3 md:col-span-8 md:col-start-5 md:row-start-1 md:mt-1 md:pb-8',
          'lg:col-span-4 lg:row-span-2 lg:pb-0',
          gapLg,
        )}
      >
        <h3 className="max-w-[18ch] text-subtitle font-semibold [overflow-wrap:break-word]">
          {event.title}
        </h3>
        {event.description && (
          <p className="max-w-[40ch] text-fg-mute [overflow-wrap:break-word]">
            {event.description}
          </p>
        )}
      </Reveal>

      <div
        className={cn(
          'mt-8 md:col-span-8 md:col-start-5 md:row-start-2 md:mt-0',
          'lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:mt-2',
          gap,
          gapLg,
        )}
      >
        <div style={{ width: `${Math.round(width * 1000) / 10}%` }}>
          <Frame>
            <ClipReveal from="left">
              <SmartImage
                media={event.image}
                crop
                className={dense ? 'aspect-[3/2]' : 'aspect-[4/3]'}
                sizes="(min-width: 1024px) 30vw, (min-width: 768px) 60vw, 100vw"
              />
            </ClipReveal>
          </Frame>
        </div>
      </div>

      {interval && <Interval label={interval} />}
    </li>
  )
}

/**
 * The station on the line: sits on x = --trace-x at the middle of the year, with a leader from
 * the line into the year. Unlit it is a hollow node; lit, it fills and the leader is drawn.
 * The current (last) event gets a ring, like the current stage of the cycle scene.
 */
const StationMark = forwardRef<HTMLSpanElement, { lit: boolean; now: boolean }>(
  function StationMark({ lit, now }, ref) {
    const reduce = useReducedMotion()
    const t = { duration: reduce ? DUR.base : DUR.step, ease: EASE_OUT }
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className="absolute left-[calc(var(--trace-x)-var(--pad-l))] top-1/2 z-[3] h-0 w-0"
      >
        <m.span
          className="absolute left-0 top-0 h-px w-[calc(var(--pad-l)-var(--trace-x)-10px)] origin-left bg-trace"
          initial={false}
          animate={reduce ? { opacity: lit ? 1 : 0 } : { scaleX: lit ? 1 : 0 }}
          transition={t}
        />
        <span className="absolute -left-[6px] -top-[6px] h-3 w-3 rounded-full bg-surface shadow-[inset_0_0_0_1.5px_rgb(var(--fg-mute))]" />
        <m.span
          className={cn(
            'absolute rounded-full bg-trace',
            now
              ? '-left-[11px] -top-[11px] h-[22px] w-[22px] shadow-[inset_0_0_0_2px_rgb(var(--trace)),inset_0_0_0_6px_rgb(var(--surface))]'
              : '-left-[6px] -top-[6px] h-3 w-3',
          )}
          initial={false}
          animate={
            reduce ? { opacity: lit ? 1 : 0 } : { opacity: lit ? 1 : 0, scale: lit ? 1 : 0.4 }
          }
          transition={t}
        />
      </span>
    )
  },
)

/**
 * Vertical dimension between two stations: |—— 3 года. On a desktop it runs from under the year
 * to the next row (the row height is the measured gap); on a phone it is a fixed step.
 */
function Interval({ label }: { label: string }) {
  const reduce = useReducedMotion()
  return (
    <div
      aria-hidden="true"
      className="relative my-8 flex h-20 items-center pl-6 text-fg-mute md:col-span-4 md:col-start-1 md:row-start-2 md:my-0 md:mt-10 md:h-auto md:min-h-24"
    >
      <m.span
        className="absolute inset-y-0 left-0 w-[11px] origin-top"
        initial={reduce ? false : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, margin: AT_PEN }}
        transition={{ duration: DUR.draw, ease: EASE_OUT }}
      >
        <span className="absolute inset-x-0 top-0 h-px bg-current" />
        <span className="absolute inset-y-0 left-[5px] w-px bg-current" />
        <span className="absolute inset-x-0 bottom-0 h-px bg-current" />
      </m.span>
      <span className="mono-label whitespace-nowrap">{label}</span>
    </div>
  )
}
