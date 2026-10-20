import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { DUR, EASE_OUT } from '@/lib/motion'
import { DATUM } from './trace'

/** Horizontal datum from the margin to the right edge, its mark «±0,000» at the end. */
export function Datum({ className }: { className?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <div className={`relative ml-[calc(var(--trace-x)-var(--pad-l))] h-px ${className ?? ''}`}>
      <span
        data-trace-anchor={DATUM}
        aria-hidden="true"
        className="absolute left-0 top-0 h-px w-0"
      />
      <span
        aria-hidden="true"
        className="absolute -left-[6px] -top-[6px] h-3 w-3 rounded-full border-[1.5px] border-trace bg-surface"
      />
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-trace"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: DUR.draw, ease: EASE_OUT, delay: 0.1 }}
      />
      <span aria-hidden="true" className="mono-label absolute bottom-2.5 right-0 pr-6">
        {t('sheet.datum')}
        <span className="absolute -bottom-2.5 right-0.5 h-2 w-3 bg-trace [clip-path:polygon(0_0,100%_0,50%_100%)]" />
      </span>
    </div>
  )
}
