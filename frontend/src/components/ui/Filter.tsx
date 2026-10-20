import { useId, useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { pad2 } from '@/sections/sectionNumber'

type Option = {
  value: string
  label: string
  /** Number of items behind the option, shown in mono after the label. */
  count?: number
}

type Props = {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  className?: string
  /** Show the label as a mono caption above the segments (otherwise it is the aria-label only). */
  showLabel?: boolean
}

const MOVE_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']

/**
 * Segment filter in the drawing language: hairline mono cells that close every row, the legend
 * square filled with the line colour on the active one (the same segments as the topic of the
 * contact form). Toggle buttons with aria-pressed; Tab reaches each, arrows/Home/End move along.
 */
export function Filter({ label, options, value, onChange, className, showLabel }: Props) {
  const group = useRef<HTMLDivElement>(null)
  const labelId = useId()

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!MOVE_KEYS.includes(e.key)) return
    const buttons = Array.from(group.current?.querySelectorAll('button') ?? [])
    const i = buttons.findIndex((b) => b === document.activeElement)
    if (i < 0) return
    e.preventDefault()
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? buttons.length - 1
          : (i + step + buttons.length) % buttons.length
    buttons[next]?.focus()
  }

  return (
    <div className={className}>
      {showLabel && (
        <p id={labelId} className="mono-label mb-3">
          {label}
        </p>
      )}
      <div
        ref={group}
        role="group"
        aria-label={showLabel ? undefined : label}
        aria-labelledby={showLabel ? labelId : undefined}
        onKeyDown={onKeyDown}
        className="flex flex-wrap overflow-x-auto border-l border-t border-line"
      >
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={cn(
                'relative flex min-h-12 flex-auto items-center gap-3 border-b border-r border-line px-3 text-left sm:px-4',
                'font-mono text-caption font-medium uppercase transition-colors duration-1',
                'focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[rgb(var(--accent-ink))]',
                on ? 'bg-surface-2 text-fg' : 'text-fg-mute hover:text-fg',
              )}
            >
              {/* the legend square of the drawing: empty, or filled with the line colour */}
              <span
                aria-hidden="true"
                className={cn(
                  'h-2.5 w-2.5 flex-none border transition-colors duration-1',
                  on ? 'border-trace bg-trace' : 'border-current',
                )}
              />
              {/* words never break: a long label wraps between words and the cell grows taller */}
              <span className="[overflow-wrap:normal] [word-break:normal]">{o.label}</span>
              {o.count != null && (
                <span className="tabular ml-auto pl-2 text-fg-mute">{pad2(o.count)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
