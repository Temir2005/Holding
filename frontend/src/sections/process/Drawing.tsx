import { m, useTransform, type MotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

type Pt = [number, number]
const L = (pts: Pt[]) => 'M' + pts.map((p) => p.join(' ')).join('L')

/** 45° hatch clipped to a rectangle: the panels of the elevation. */
function hatch(x0: number, y0: number, x1: number, y1: number, step: number) {
  const out: string[] = []
  for (let c = x0 + y0 + step; c < x1 + y1; c += step) {
    const ax = Math.max(x0, c - y1)
    const bx = Math.min(x1, c - y0)
    out.push(
      L([
        [ax, c - ax],
        [bx, c - bx],
      ]),
    )
  }
  return out.join('')
}
const win = (x: number, y: number) => `M${x} ${y}h16v18h-16Z`

type Kind = 'ink' | 'mute' | 'hatch' | 'mark'

/**
 * Twelve elementary parts of one sheet (plan + elevation) in the order of the cycle:
 * the site and its dimensions, the plan and its axes, walls, the elevation, panels, frame and
 * slabs, roof and windows, the level mark ±0,000. All subpaths of a part are one path, so the
 * pen draws them one after another.
 */
const PARTS: [Kind, string][] = [
  [
    'ink',
    L([
      [30, 64],
      [212, 44],
      [226, 262],
      [42, 280],
      [30, 64],
    ]),
  ],
  ['ink', 'M30 30H212M30 24V36M212 24V36M14 64V280M8 64H20M8 280H20'],
  [
    'ink',
    L([
      [74, 96],
      [184, 96],
      [184, 222],
      [74, 222],
      [74, 96],
    ]),
  ],
  ['mute', 'M74 84V234M129 84V234M184 84V234M62 96H196M62 159H196M62 222H196'],
  ['ink', 'M129 96V159M74 159H184M156 159V222M96 222V206'],
  [
    'ink',
    'M250 300H470' +
      L([
        [272, 300],
        [272, 112],
        [446, 112],
        [446, 300],
      ]),
  ],
  ['hatch', hatch(272, 206, 446, 300, 14)],
  ['hatch', hatch(272, 112, 446, 206, 14)],
  ['ink', 'M300 112V300M359 112V300M418 112V300'],
  ['ink', 'M264 253H454M264 206H454M264 159H454'],
  [
    'ink',
    'M264 112H454M276 104H442' +
      [282, 341, 400].flatMap((x) => [222, 175, 128].map((y) => win(x, y))).join(''),
  ],
  ['mark', 'M462 300V112M456 300H468M456 112H468M452 312l10 -12l10 12Z'],
]

const STROKE: Record<Kind, string> = {
  ink: 'stroke-fg [stroke-width:1.3]',
  mute: 'stroke-fg-mute [stroke-width:0.9]',
  hatch: 'stroke-trace [stroke-width:0.9]',
  mark: 'stroke-trace [stroke-width:1.5]',
}

/**
 * Range of the scene progress in which part k draws. Part k belongs to stage floor(k·N/12), so
 * for any N from 1 to 12 every stage adds at least one part and none twice; the parts of a stage
 * share the first 75% of its scroll, drawn parts stay.
 */
function partRange(k: number, n: number): [number, number] {
  const stage = Math.floor((k * n) / PARTS.length)
  const own = PARTS.map((_, j) => j).filter((j) => Math.floor((j * n) / PARTS.length) === stage)
  const j = own.indexOf(k)
  const a = (stage + (0.75 * j) / own.length) / n
  const b = (stage + (0.75 * (j + 1)) / own.length) / n
  return [a, b]
}

/**
 * The shot of a stage without a photo: a fragment of a drawing that grows from stage to stage
 * (site → plan → panels → frame and slabs → elevation with the ±0,000 mark), drawn by the
 * scroll progress of the pinned scene. Decorative.
 */
export function Drawing({ progress, n }: { progress: MotionValue<number>; n: number }) {
  const { t } = useTranslation()
  const last = partRange(PARTS.length - 1, n)
  const level = useTransform(progress, last, [0, 1])
  return (
    <svg
      viewBox="0 0 480 340"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-[6%] h-[88%] w-[88%] overflow-visible"
    >
      {PARTS.map(([kind, d], k) => (
        <Part key={k} kind={kind} d={d} range={partRange(k, n)} progress={progress} />
      ))}
      <m.text
        x="402"
        y="330"
        style={{ opacity: level }}
        className="fill-fg-mute font-mono text-[11px] tracking-[0.04em]"
      >
        {t('sheet.datum')}
      </m.text>
    </svg>
  )
}

function Part({
  kind,
  d,
  range,
  progress,
}: {
  kind: Kind
  d: string
  range: [number, number]
  progress: MotionValue<number>
}) {
  const drawn = useTransform(progress, range, [0, 1])
  return (
    <m.path
      d={d}
      fill="none"
      // butt caps: a part that has not started yet leaves no dot
      className={cn(STROKE[kind])}
      style={{ pathLength: drawn }}
    />
  )
}
