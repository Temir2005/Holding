import { useRef, type ReactNode } from 'react'
import type { Tone } from '@/api/types'
import type { TracePath } from '@/components/trace/paths'
import { TraceSegment } from '@/components/trace/TraceSegment'
import { cn } from '@/lib/cn'
import { Container } from './Container'

type Props = {
  tone: Tone
  anchor?: string | null
  children: ReactNode
  className?: string
  /** Full-bleed content skips the inner container. */
  bleed?: boolean
  labelledBy?: string
  /** The section's part of the red line. Default: a straight pass through the margin. */
  trace?: TracePath | false
  /** Vertical rhythm: `default` for most blocks, `tight` for quiet ones, `none` for scenes. */
  space?: 'default' | 'tight' | 'none'
}

/**
 * Every CMS section renders inside this "sheet": tone, anchor, vertical rhythm, the ruler on top,
 * the 12-column guides and its segment of the red line. Sections never rely on their neighbours.
 */
export function Section({
  tone,
  anchor,
  children,
  className,
  bleed,
  labelledBy,
  trace,
  space = 'default',
}: Props) {
  const ref = useRef<HTMLElement>(null)
  return (
    <section
      ref={ref}
      id={anchor ?? undefined}
      aria-labelledby={labelledBy}
      className={cn(
        `tone-${tone}`,
        'sheet',
        space === 'default' && 'pb-section-y-end pt-section-y',
        space === 'tight' && 'py-12 md:py-16',
        className,
      )}
    >
      <SheetGuides />
      {trace !== false && <TraceSegment target={ref} path={trace} />}
      {bleed ? children : <Container>{children}</Container>}
    </section>
  )
}

/** Quiet construction grid: 12 columns on desktop, 2 on a phone. Decorative only. */
export function SheetGuides() {
  return (
    <div aria-hidden="true" className="sheet-guides">
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  )
}
