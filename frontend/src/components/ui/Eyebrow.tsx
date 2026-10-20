import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { pad2, useSectionNumber } from '@/sections/sectionNumber'

type Props = {
  children?: ReactNode
  className?: string
  /** Show the sheet number "02 / 04" from PageRenderer (when there is one). */
  numbered?: boolean
  /** A short station tick from the line in the margin to the meta row. */
  station?: boolean
}

/** Section meta row: sheet number and a mono label, like the title strip of a drawing. */
export function Eyebrow({ children, className, numbered = true, station = true }: Props) {
  const number = useSectionNumber()
  const showNumber = numbered && number
  if (!children && !showNumber) return null
  return (
    <p className={cn('eyebrow relative flex flex-wrap items-baseline gap-x-8 gap-y-1', className)}>
      {station && (
        <span
          aria-hidden="true"
          className="absolute left-[calc(var(--trace-x)-var(--pad-l))] top-[0.7em] h-px w-[calc(var(--pad-l)-var(--trace-x)-12px)] bg-trace"
        />
      )}
      {showNumber && (
        <span aria-hidden="true" className="tabular text-fg">
          {pad2(number.index)} / {pad2(number.total)}
        </span>
      )}
      {children && <span>{children}</span>}
    </p>
  )
}
