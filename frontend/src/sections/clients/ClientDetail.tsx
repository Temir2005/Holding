import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Client, Tone } from '@/api/types'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT } from '@/lib/motion'
import { pad2 } from '../sectionNumber'

type Props = {
  client: Client
  number: number
  id: string
  tone: Tone
  order: number
  onClose: () => void
}

/**
 * The strip a cell opens under its row, across the whole grid: the same lit paper as the open
 * cell, so the two read as one sheet pulled out of the legend. It unrolls from the row (clip-path);
 * with reduced motion it only fades in. Esc or the close button folds it back.
 */
export function ClientDetail({ client, number, id, tone, order, onClose }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const href = client.website_url

  return (
    <motion.li
      id={id}
      style={{ order }}
      className={cn(
        'col-span-full border-b border-r border-line',
        tone === 'light' ? 'bg-surface-2' : 'tone-light',
      )}
      initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: reduce ? DUR.base : DUR.step, ease: EASE_OUT }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="grid grid-cols-1 gap-x-gap gap-y-5 p-5 md:p-8 lg:grid-cols-12 lg:py-10">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <p className="mono-label flex flex-wrap gap-x-6 gap-y-1">
            <span aria-hidden="true" className="tabular text-fg">
              {pad2(number)}
            </span>
            {client.industry_label && <span>{client.industry_label}</span>}
          </p>
          <h3 className="text-subtitle font-semibold [overflow-wrap:break-word]">{client.name}</h3>
        </div>
        <p className="max-w-[52ch] text-lead [overflow-wrap:break-word] lg:col-span-5">
          {client.description}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end lg:justify-start">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-3 font-medium"
            >
              <span className="link-draw">{t('common.visitSite')}</span>
              <span aria-hidden="true" className="text-lg leading-none">
                ↗
              </span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mono-label inline-flex min-h-11 items-center gap-2 transition-colors duration-1 hover:text-fg"
          >
            {t('common.close')}
            <span aria-hidden="true" className="text-base leading-none">
              ×
            </span>
          </button>
        </div>
      </div>
    </motion.li>
  )
}
