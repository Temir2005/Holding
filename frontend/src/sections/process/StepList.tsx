import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT, PEN } from '@/lib/motion'
import { pad2 } from '../sectionNumber'
import { DivisionCallout } from './DivisionCallout'
import type { Step } from './Scene'

/** Anchor of the callouts: the line branches off the margin into each one. */
export const DIVISION_ANCHOR = 'process-division'

/** In-view margin that puts the bottom edge of the viewport at the pen height. */
const AT_PEN = `0px 0px ${parseFloat(PEN) - 100}% 0px` as const

/**
 * The cycle without the pinned scene (reduced motion, a single stage): every stage open, one
 * under another, numbered like sheets. Each stage is a node on the line in the margin; a stage
 * done by a division gets a callout the line branches into.
 */
export function StepList({ steps }: { steps: Step[] }) {
  const dense = steps.length > 6
  return (
    <ol role="list">
      {steps.map((step, i) => (
        <Item key={i} step={step} index={i} dense={dense} />
      ))}
    </ol>
  )
}

function Item({ step, index, dense }: { step: Step; index: number; dense: boolean }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const mark = useRef<HTMLSpanElement>(null)
  const reached = useInView(mark, { once: true, margin: AT_PEN })
  const lit = Boolean(reduce) || reached
  const key = Boolean(step.division)
  return (
    <li
      className={cn(
        'relative grid grid-cols-[minmax(0,1fr)] gap-x-gap border-t border-line last:border-b md:grid-cols-[clamp(88px,11vw,200px)_minmax(0,1fr)]',
        dense ? 'py-6' : 'py-[clamp(24px,2.4vw,40px)]',
      )}
    >
      <p
        aria-hidden="true"
        className={cn(
          'relative tabular font-extralight leading-[0.8] tracking-[-0.05em]',
          dense ? 'text-[clamp(56px,5.2vw,96px)]' : 'text-[clamp(64px,8vw,140px)]',
          key ? 'text-accent-ink' : 'text-fg',
        )}
      >
        <span
          ref={mark}
          className="absolute left-[calc(var(--trace-x)-var(--pad-l))] top-[0.41em] z-[3] h-0 w-0"
        >
          <span
            className={cn(
              'absolute rounded-full bg-surface',
              key
                ? '-left-[11px] -top-[11px] h-[22px] w-[22px] shadow-[inset_0_0_0_2px_rgb(var(--trace))]'
                : '-left-[6px] -top-[6px] h-3 w-3 shadow-[inset_0_0_0_2px_rgb(var(--trace))]',
            )}
          />
          <motion.span
            className={cn(
              'absolute rounded-full bg-trace',
              key
                ? '-left-[11px] -top-[11px] h-[22px] w-[22px] shadow-[inset_0_0_0_2px_rgb(var(--trace)),inset_0_0_0_6px_rgb(var(--surface))]'
                : '-left-[6px] -top-[6px] h-3 w-3',
            )}
            initial={false}
            animate={
              reduce ? { opacity: lit ? 1 : 0 } : { opacity: lit ? 1 : 0, scale: lit ? 1 : 0.4 }
            }
            transition={{ duration: reduce ? DUR.base : DUR.step, ease: EASE_OUT }}
          />
        </span>
        {pad2(index + 1)}
      </p>

      <Reveal className="mt-4 grid gap-3 md:mt-[0.3em] md:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] md:gap-x-[calc(var(--gap)*2)] lg:max-w-[1040px]">
        <h3 className="max-w-[18ch] text-subtitle font-semibold [overflow-wrap:break-word]">
          <span className="sr-only">
            {t('process.stage')} {pad2(index + 1)}.{' '}
          </span>
          {step.title}
        </h3>
        {step.text && <p className="max-w-[44ch] text-fg-mute">{step.text}</p>}
      </Reveal>

      {step.division && (
        <DivisionCallout
          division={step.division}
          drawn
          anchor={DIVISION_ANCHOR}
          className="mt-6 md:col-span-2"
        />
      )}

      {step.media && (
        <div className="mt-6 max-w-[420px] md:col-start-2">
          <Frame>
            <ClipReveal from="left">
              <SmartImage
                media={step.media}
                crop
                className="aspect-[4/3]"
                sizes="(min-width: 768px) 420px, 100vw"
              />
            </ClipReveal>
          </Frame>
        </div>
      )}
    </li>
  )
}
