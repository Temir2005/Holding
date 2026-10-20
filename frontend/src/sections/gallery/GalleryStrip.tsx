import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Media } from '@/api/types'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { pad2 } from '../sectionNumber'
import { Caption } from './Caption'

/**
 * A film strip: frames of one height, each as wide as its proportion, scrolled sideways inside
 * the block only (native scroll with snap, so touch drag and trackpads just work). The strip runs
 * out to the right edge of the sheet; prev/next buttons and a frame counter sit under it.
 */
export function GalleryStrip({ items, label }: { items: Media[]; label: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const scroller = useRef<HTMLUListElement>(null)
  const [state, setState] = useState({ index: 0, atStart: true, atEnd: items.length < 2 })

  // Index of the frame at the start edge; read on scroll (passive, once per frame).
  const read = useCallback(() => {
    const el = scroller.current
    if (!el) return
    // the list is the offsetParent of its frames: offsets are in its scrolled content
    const frames = [...el.children] as HTMLElement[]
    const start = el.scrollLeft + parseFloat(getComputedStyle(el).paddingLeft)
    let index = 0
    frames.forEach((f, i) => {
      if (f.offsetLeft - 24 <= start) index = i
    })
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
    setState({ index: atEnd ? frames.length - 1 : index, atStart: el.scrollLeft <= 2, atEnd })
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(read)
    }
    read()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [read])

  const go = (step: 1 | -1) => {
    const el = scroller.current
    const target = el?.children[Math.max(0, Math.min(items.length - 1, state.index + step))]
    if (!el || !(target instanceof HTMLElement)) return
    el.scrollTo({
      left: target.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft),
      behavior: reduce ? 'auto' : 'smooth',
    })
  }

  const multiple = items.length > 1

  return (
    <div>
      {/* Focusable, so the strip scrolls with the arrow keys too. */}
      <ul
        ref={scroller}
        role="list"
        tabIndex={multiple ? 0 : undefined}
        aria-label={label}
        className={cn(
          // room for the crop marks around the frames; the strip runs out to the sheet edge
          'relative -my-3 -ml-3 mr-[calc(var(--pad-r)*-1)] px-3 py-3 pr-pad-r',
          'flex snap-x snap-mandatory gap-gap overflow-x-auto overscroll-x-contain scroll-pl-3',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {items.map((m, i) => (
          // as wide as the frame: a long caption wraps under it instead of widening it
          <li key={m.id} className="w-min flex-none snap-start">
            <Frame caption={<Caption index={i} media={m} />}>
              <div
                className="h-[clamp(11rem,48vw,22rem)] md:h-[clamp(18rem,32vw,34rem)]"
                style={{ aspectRatio: `${m.width} / ${m.height}` }}
              >
                <SmartImage media={m} fill sizes="(min-width: 768px) 60vw, 90vw" />
              </div>
            </Frame>
          </li>
        ))}
      </ul>

      {multiple && (
        <div className="mt-8 flex items-center justify-between gap-6 border-t border-line pt-4">
          <p aria-hidden="true" className="tabular font-mono text-caption font-medium text-fg">
            <span className="text-accent-ink">{pad2(state.index + 1)}</span>
            <span className="text-fg-mute"> / {pad2(items.length)}</span>
          </p>
          <div className="flex gap-2">
            <StepButton
              label={t('a11y.prev')}
              dir={-1}
              disabled={state.atStart}
              onClick={() => go(-1)}
            />
            <StepButton
              label={t('a11y.next')}
              dir={1}
              disabled={state.atEnd}
              onClick={() => go(1)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StepButton({
  label,
  dir,
  disabled,
  onClick,
}: {
  label: string
  dir: 1 | -1
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-12 w-12 place-items-center border border-fg text-fg transition-colors duration-2 hover:bg-fg hover:text-surface disabled:cursor-default disabled:border-line disabled:text-fg-mute disabled:hover:bg-transparent"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="11"
        viewBox="0 0 18 11"
        className={cn('overflow-visible', dir === -1 && 'rotate-180')}
      >
        <path d="M0 5.5H17M12 1L17 5.5L12 10" fill="none" stroke="currentColor" />
      </svg>
    </button>
  )
}
