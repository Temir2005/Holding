import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '@/api/schema'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'

type Swatch = components['schemas']['SwatchRead']

/** Anchor of the legend caption: the line marks it with a station tick. */
export const LEGEND_ANCHOR = 'production-legend'

// Columns on wide screens: as many as samples up to six, so 1–6 make one closed row, 12 two.
const COLS = [
  '',
  'lg:grid-cols-1',
  'lg:grid-cols-2',
  'lg:grid-cols-3',
  'lg:grid-cols-4',
  'lg:grid-cols-5',
  'lg:grid-cols-6',
]

/** Only plain colour values reach the style; anything else falls back to the plate of the tone. */
const COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/-]+\))$/i

/** The finish as a surface: fine grain (matte), a highlight (gloss), a ribbed pattern (texture). */
function finish(color: string, kind: Swatch['finish']): CSSProperties {
  const c = COLOR.test(color.trim()) ? color.trim() : 'rgb(var(--plate))'
  if (kind === 'gloss')
    return {
      background: `linear-gradient(118deg, transparent 34%, rgba(255,255,255,0.28) 44%, transparent 52%, transparent 60%, rgba(255,255,255,0.12) 64%, transparent 68%), ${c}`,
    }
  if (kind === 'texture')
    return {
      background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.09) 0 1px, transparent 1px 3px, rgba(0,0,0,0.05) 3px 4px, transparent 4px 7px), ${c}`,
    }
  return {
    background: `radial-gradient(rgba(0,0,0,0.09) 0.6px, transparent 0.8px) 0 0 / 3px 3px, ${c}`,
  }
}

/**
 * «Условные обозначения материалов»: the legend of a drawing. A square sample with its finish,
 * the RAL / LAB code in mono, the name. Hairlines close every row of the grid.
 */
export function Legend({ swatches }: { swatches: Swatch[] }) {
  const { t } = useTranslation()
  const cols = COLS[Math.min(6, swatches.length)]
  return (
    <Reveal>
      <p data-trace-anchor={LEGEND_ANCHOR} className="mono-label border-b border-line-strong pb-3">
        {t('production.legend')}
      </p>
      <ul className={cn('grid grid-cols-2 gap-x-gap md:grid-cols-3', cols)}>
        {swatches.map((w, i) => (
          <li
            key={`${w.code}-${i}`}
            className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 border-b border-line py-4 md:grid-cols-[3.5rem_minmax(0,1fr)]"
          >
            <span
              aria-hidden="true"
              className="aspect-square w-full shadow-[inset_0_0_0_1px_rgb(var(--line-strong))] transition-transform duration-3 ease-out"
              style={{ ...finish(w.color, w.finish), transitionDelay: `${stagger(i)}s` }}
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-fg [overflow-wrap:anywhere]">
                {w.code}
              </span>
              <span className="text-sm leading-snug text-fg-mute [overflow-wrap:anywhere]">
                {w.label}
                <span className="sr-only">, {t(`production.finish.${w.finish}`)}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
