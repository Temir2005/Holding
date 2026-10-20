import { motion, useTransform, type MotionValue } from 'framer-motion'
import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '@/api/schema'
import { pinnedHeight } from '@/components/motion/usePinnedSteps'
import { Frame } from '@/components/ui/Frame'
import { SheetGuides } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { pad2 } from '../sectionNumber'
import { DivisionCallout } from './DivisionCallout'
import { Drawing } from './Drawing'
import { offsetIn, sceneGeometry, stageScrollTop, type SceneGeometry } from './geometry'

export type Step = components['schemas']['ProcessStepRead']

type Props = {
  steps: Step[]
  /** The tall element usePinnedSteps tracks (100svh + N·65svh). */
  sceneRef: RefObject<HTMLDivElement>
  active: number
  progress: MotionValue<number>
}

const EASE = 'cubic-bezier(.2,.7,.2,1)'

/**
 * «Полный цикл» as a pinned scene: the section is 100svh + N·65svh tall and its stage is sticky
 * for 100svh. Only the scroll position drives it (native scrolling, scrolling up steps back).
 * Wide screens, three bands: the rail of collapsed stages on top (past ones solid, the current
 * one a ring, future ones hollow), the open stage in the middle with its shot on the right
 * (the stage photo, or a drawing that grows stage by stage), the progress dimension at the
 * bottom. Phones: the vertical rail of numbers on the line in the margin, the shot over the text.
 * The stage draws its own part of the red line; at both edges of the scene it is in the margin.
 */
export function Scene({ steps, sceneRef, active, progress }: Props) {
  const { t } = useTranslation()
  const n = steps.length
  const stageRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const railRef = useRef<HTMLOListElement>(null)
  const geo = useGeometry(stageRef, probeRef, railRef, n)
  const drawingAt = steps.some((s) => !s.media)
  const current = steps[active]
  // Rail names are a short index on wide screens (two lines at most), dropped past 7 stages.
  const names = n <= 7
  // Long stages (Kazakh, long CMS texts) get a smaller step of the type and a lower frame, the
  // same for every stage so nothing jumps between them: everything still fits in 100svh.
  const dense = steps.some((s) => s.title.length > 44 || s.title.length + s.text.length > 190)

  const toStage = (i: number) => {
    const scene = sceneRef.current
    const stage = stageRef.current
    if (i === active || !scene || !stage) return
    window.scrollTo({ top: stageScrollTop(scene, stage, i, n), behavior: 'instant' })
  }

  const style = {
    '--n': n,
    '--entry': `${geo?.entry ?? 0}px`,
    // Opaque sheet with a slit at the line above the entry point: up to there the section's own
    // line shows through, so before the pin the pen draws it like everywhere else.
    background:
      'linear-gradient(90deg, rgb(var(--surface)) calc(var(--trace-x) - 3px), transparent 0 calc(var(--trace-x) + 3px), rgb(var(--surface)) 0) 0 0 / 100% var(--entry) no-repeat,' +
      'linear-gradient(rgb(var(--surface)), rgb(var(--surface))) 0 100% / 100% calc(100% - var(--entry)) no-repeat',
  } as CSSProperties

  return (
    <div
      ref={sceneRef}
      data-scene=""
      className="relative -mt-8"
      style={{ height: pinnedHeight(n) }}
    >
      <div
        ref={stageRef}
        data-scene-stage=""
        style={style}
        className="sticky top-0 z-[3] isolate h-[100svh] overflow-hidden"
      >
        <SheetGuides />
        {/* the scale beside the line, fixed with the stage */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-[calc(var(--trace-x)+8px)] -z-[1] w-1 bg-[repeating-linear-gradient(180deg,rgb(var(--fg)/0.14)_0_1px,transparent_1px_64px)] md:bg-[repeating-linear-gradient(180deg,rgb(var(--fg)/0.14)_0_1px,transparent_1px_32px)]"
        />
        <span
          ref={probeRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-[var(--trace-x)] top-0 h-0 w-0"
        />
        {geo && <ScenePath geo={geo} progress={progress} />}

        <div
          className={cn(
            'relative z-[3] mx-auto grid h-full max-w-sheet pl-pad-l pr-pad-r',
            'grid-cols-[2.5rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-x-4 gap-y-6 pb-8 pt-[calc(var(--header-h)+24px)]',
            'md:grid-cols-1 md:grid-rows-[auto_minmax(0,1fr)_auto] md:gap-y-[clamp(24px,5svh,56px)] md:pb-16 md:pt-[calc(var(--header-h)+32px)]',
          )}
        >
          <ol
            ref={railRef}
            aria-hidden="true"
            className={cn(
              'relative col-start-1 row-start-1 flex flex-col self-center',
              'gap-[clamp(12px,calc((100svh-320px)/var(--n)-16px),64px)]',
              'md:grid md:grid-cols-[repeat(var(--n),minmax(0,1fr))] md:gap-0 md:self-auto',
            )}
          >
            {steps.map((step, i) => (
              <Tick
                key={i}
                index={i}
                state={i < active ? 'past' : i === active ? 'current' : 'future'}
                keyStage={Boolean(step.division)}
                title={step.title}
                names={names}
              />
            ))}
          </ol>

          <div className="col-start-2 row-start-1 flex min-h-0 flex-col gap-6 md:col-start-1 md:row-start-2 md:gap-8 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-gap lg:gap-y-0">
            <ol role="list" className="relative min-h-0 flex-1 lg:col-span-7 lg:self-stretch">
              {steps.map((step, i) => (
                <Panel
                  key={i}
                  step={step}
                  index={i}
                  open={i === active}
                  dense={dense}
                  label={t('process.stage')}
                  onFocus={() => toStage(i)}
                />
              ))}
            </ol>

            <div className="order-first lg:order-none lg:col-span-5 lg:col-start-8">
              <Frame>
                <div
                  className={cn(
                    'relative aspect-[4/3] w-full md:max-h-[38svh] lg:max-h-[calc(100svh-360px)]',
                    dense ? 'max-h-[20svh]' : 'max-h-[30svh]',
                  )}
                >
                  {drawingAt && (
                    <div
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-0 bg-surface-2 shadow-[inset_0_0_0_1px_rgb(var(--line))]',
                        'bg-[linear-gradient(rgb(var(--fg)/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--fg)/0.05)_1px,transparent_1px)] bg-[size:24px_24px]',
                        'transition-opacity duration-3 ease-out',
                        current?.media ? 'opacity-0' : 'opacity-100',
                      )}
                    >
                      <Drawing progress={progress} n={n} />
                    </div>
                  )}
                  {steps.map((step, i) =>
                    step.media ? (
                      <div
                        key={i}
                        className={cn(
                          'absolute inset-0',
                          i === active
                            ? 'opacity-100 [clip-path:inset(0)]'
                            : 'opacity-0 [clip-path:inset(0_100%_0_0)]',
                        )}
                        style={{
                          transition:
                            i === active
                              ? `opacity 420ms ${EASE}, clip-path 450ms ${EASE}`
                              : 'opacity 400ms linear, clip-path 0s linear 420ms',
                        }}
                      >
                        <SmartImage media={step.media} fill sizes="(min-width: 768px) 40vw, 75vw" />
                      </div>
                    ) : null,
                  )}
                </div>
              </Frame>
            </div>
          </div>

          <Progress progress={progress} label={t('process.stage')} current={active + 1} total={n} />
        </div>
      </div>
    </div>
  )
}

/** The stage's part of the line and the corner marks on its turns, drawn with p. */
function ScenePath({ geo, progress }: { geo: SceneGeometry; progress: MotionValue<number> }) {
  const drawn = useTransform(progress, geo.keys, geo.lens, { clamp: true })
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible"
      width={geo.w}
      height={geo.h}
    >
      <motion.path
        d={geo.d}
        fill="none"
        stroke="rgb(var(--trace))"
        strokeWidth={2}
        style={{ pathLength: drawn }}
      />
      {geo.corners.map((c) => (
        <Corner key={`${c.x}-${c.y}`} x={c.x} y={c.y} at={c.at} drawn={drawn} />
      ))}
    </svg>
  )
}

function Corner({
  x,
  y,
  at,
  drawn,
}: {
  x: number
  y: number
  at: number
  drawn: MotionValue<number>
}) {
  const opacity = useTransform(drawn, (v) => (v > 0.0005 && v >= at - 0.0005 ? 1 : 0))
  return (
    <motion.rect
      x={x - 4.5}
      y={y - 4.5}
      width={9}
      height={9}
      fill="rgb(var(--surface))"
      stroke="rgb(var(--trace))"
      strokeWidth={1.5}
      style={{ opacity }}
    />
  )
}

type TickState = 'past' | 'current' | 'future'

/** A collapsed stage on the rail: number, node on the axis, short name (wide screens). */
function Tick({
  index,
  state,
  keyStage,
  title,
  names,
}: {
  index: number
  state: TickState
  keyStage: boolean
  title: string
  names: boolean
}) {
  return (
    <li className="relative block md:grid md:grid-rows-[16px_24px_auto] md:px-4">
      <span
        className={cn(
          'block font-mono text-caption font-medium leading-4 transition-colors duration-2 md:row-start-1',
          state === 'current' ? 'text-accent-ink' : state === 'past' ? 'text-fg' : 'text-fg-mute',
        )}
      >
        {pad2(index + 1)}
        {keyStage && (
          <span className="ml-1 inline-block h-[5px] w-[5px] rotate-45 bg-trace align-middle md:ml-2" />
        )}
      </span>
      <span
        data-node=""
        className={cn(
          'absolute left-[calc(var(--trace-x)-var(--pad-l)-6px)] top-[2px] h-3 w-3 rounded-full md:left-[-6px] md:top-[22px]',
          'transition-[transform,background-color,box-shadow] duration-3 ease-out',
          state === 'past' && 'bg-trace shadow-[inset_0_0_0_1.5px_rgb(var(--trace))]',
          state === 'current' &&
            'scale-[1.75] bg-surface shadow-[inset_0_0_0_1.25px_rgb(var(--trace)),inset_0_0_0_3.5px_rgb(var(--surface)),inset_0_0_0_12px_rgb(var(--trace))]',
          state === 'future' && 'bg-surface shadow-[inset_0_0_0_1.5px_rgb(var(--fg-mute))]',
        )}
      />
      {names && (
        <span className="hidden md:row-start-3 md:block">
          <span
            className={cn(
              'mono-label line-clamp-2 max-w-[22ch] transition-colors duration-2 [overflow-wrap:anywhere]',
              state === 'future' ? 'text-fg-mute' : 'text-fg',
            )}
          >
            {title}
          </span>
        </span>
      )}
    </li>
  )
}

/**
 * The open stage. Every stage stays in the DOM (readable, focusable); the closed ones are only
 * transparent, and focus inside one scrolls the scene to it.
 */
function Panel({
  step,
  index,
  open,
  dense,
  label,
  onFocus,
}: {
  step: Step
  index: number
  open: boolean
  dense: boolean
  label: string
  onFocus: () => void
}) {
  const key = Boolean(step.division)
  return (
    <li
      onFocus={onFocus}
      data-open={open ? '' : undefined}
      className={cn(
        'absolute inset-0 flex flex-col justify-center gap-4 [justify-content:safe_center]',
        'md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] md:items-start md:gap-x-gap md:[align-content:safe_center] md:[justify-content:normal] lg:grid-cols-7 lg:pb-[4svh]',
        'transition-[opacity,transform] duration-[400ms] ease-out',
        open ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <p
        aria-hidden="true"
        className={cn(
          'tabular font-extralight leading-[0.8] tracking-[-0.05em] lg:col-span-3',
          dense
            ? 'text-[min(18vw,72px,9svh)] md:text-[clamp(80px,min(9vw,20svh),168px)]'
            : 'text-[min(24vw,104px,12svh)] md:text-[clamp(88px,min(11vw,24svh),200px)]',
          'transition-[clip-path] duration-3 ease-out',
          open ? '[clip-path:inset(-12px)]' : '[clip-path:inset(0_0_100%_0)]',
          key ? 'text-accent-ink' : 'text-fg',
        )}
      >
        {pad2(index + 1)}
      </p>
      <div className="flex flex-col gap-2 md:gap-4 md:pt-2 lg:col-span-4 lg:col-start-4">
        <h3
          className={cn(
            'font-heading leading-[1.02] tracking-[-0.03em] [overflow-wrap:break-word]',
            dense ? 'max-w-[24ch]' : 'max-w-[16ch]',
            dense
              ? 'text-[1.125rem] md:text-[clamp(1.5rem,0.8rem+1.6vw,2.75rem)]'
              : 'text-[clamp(1.375rem,1rem+2vw,1.75rem)] md:text-[clamp(1.75rem,0.9rem+2.4vw,3.75rem)] [:lang(kk)_&]:md:text-[clamp(1.625rem,0.8rem+2.1vw,3.25rem)]',
          )}
        >
          <span className="sr-only">
            {label} {pad2(index + 1)}.{' '}
          </span>
          {step.title}
        </h3>
        {step.text && (
          <p
            className={cn(
              'max-w-[36ch] leading-normal text-fg-mute',
              dense
                ? 'text-[0.875rem] md:max-w-[44ch] md:text-body'
                : 'text-base md:text-lead [:lang(kk)_&]:max-md:text-[0.9375rem]',
            )}
          >
            {step.text}
          </p>
        )}
        {step.division && <DivisionCallout division={step.division} drawn={open} />}
      </div>
    </li>
  )
}

/** |←—— ЭТАП 03 / 05 ——→| across the content, the bar grows with p. */
function Progress({
  progress,
  label,
  current,
  total,
}: {
  progress: MotionValue<number>
  label: string
  current: number
  total: number
}) {
  return (
    <div
      aria-hidden="true"
      className="relative col-span-2 row-start-2 h-[15px] text-fg-mute md:col-span-1 md:row-start-3"
    >
      <span className="absolute inset-x-0 top-[7px] h-px bg-line-strong" />
      <motion.span
        className="absolute inset-x-0 top-[6px] h-0.5 origin-left bg-fg"
        style={{ scaleX: progress }}
      />
      <End side="start" />
      <End side="end" />
      <span className="mono-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-surface px-3">
        {label} <b className="font-medium text-fg">{pad2(current)}</b> / {pad2(total)}
      </span>
    </div>
  )
}

function End({ side }: { side: 'start' | 'end' }) {
  return (
    <svg
      aria-hidden="true"
      width="7"
      height="11"
      viewBox="0 0 7 11"
      className={cn('absolute top-[2px] overflow-visible', side === 'start' ? 'left-0' : 'right-0')}
    >
      {side === 'start' ? (
        <path d="M0.5 0V11M6 2.5L0.5 5.5L6 8.5" fill="none" stroke="currentColor" />
      ) : (
        <path d="M6.5 0V11M1 2.5L6.5 5.5L1 8.5" fill="none" stroke="currentColor" />
      )}
    </svg>
  )
}

/**
 * Geometry of the stage path from layout offsets: on mount, when the stage or the rail resizes
 * (viewport, fonts) — never per frame.
 */
function useGeometry(
  stage: RefObject<HTMLDivElement>,
  probe: RefObject<HTMLSpanElement>,
  rail: RefObject<HTMLOListElement>,
  n: number,
): SceneGeometry | null {
  const [geo, setGeo] = useState<SceneGeometry | null>(null)
  useLayoutEffect(() => {
    const st = stage.current
    const pr = probe.current
    const rl = rail.current
    if (!st || !pr || !rl) return
    const measure = () => {
      const nodes = Array.from(rl.querySelectorAll<HTMLElement>('[data-node]')).map((node) => {
        const o = offsetIn(node, st)
        return [o.x + node.offsetWidth / 2, o.y + node.offsetHeight / 2] as const
      })
      const r = offsetIn(rl, st)
      const next = sceneGeometry(
        { w: st.offsetWidth, h: st.offsetHeight },
        Math.round(pr.offsetLeft) + 0.5,
        nodes,
        r.x + rl.offsetWidth,
      )
      setGeo((prev) =>
        prev && next && prev.d === next.d && prev.w === next.w && prev.h === next.h ? prev : next,
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(st)
    ro.observe(rl)
    void document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [stage, probe, rail, n])
  return geo
}
