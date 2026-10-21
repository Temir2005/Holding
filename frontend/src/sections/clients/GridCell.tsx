import { m, useReducedMotion } from 'framer-motion'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Client, Tone } from '@/api/types'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT } from '@/lib/motion'
import { pad2 } from '../sectionNumber'
import { ROW_ANCHOR } from './grid'
import { LogoMark } from './LogoMark'

type Props = {
  client: Client
  /** Position in the whole list: the legend keeps its numbers while the filter hides cells. */
  number: number
  /** Column of the cell, for the sweep along a row as it enters. */
  column: number
  tone: Tone
  open: boolean
  /** Id of the detail strip the cell controls. */
  detailId: string
  onToggle: () => void
  /** CSS order: cells, then the strip after the open cell's row. */
  order: number
  /** After the first filter change cells arrive faster: the filter is instant. */
  quick: boolean
}

/** Paper under the cell when it is lit (hover, focus, open), as on the logo wall. */
const LIT =
  'opacity-0 transition-opacity duration-2 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[open=true]:opacity-100'
/** On graphite and red sheets the lit cell is paper: its text turns carbon. */
const ON_PAPER =
  'group-hover:text-carbon group-focus-visible:text-carbon group-data-[open=true]:text-carbon'
const ON_PAPER_MUTE =
  'group-hover:text-carbon/70 group-focus-visible:text-carbon/70 group-data-[open=true]:text-carbon/70'

/**
 * One cell of the client legend: number, logo, name and industry on hairlines.
 * A client with a description opens the detail strip under its row (a disclosure button);
 * one with only a website links to it; otherwise the cell just lights on hover.
 */
export const GridCell = forwardRef<HTMLButtonElement, Props>(function GridCell(
  { client, number, column, tone, open, detailId, onToggle, order, quick },
  ref,
) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const expandable = client.description.trim() !== ''
  const href = client.website_url
  const paper = tone !== 'light'

  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn('absolute inset-0 -z-10', LIT, paper ? 'bg-paper' : 'bg-surface-2')}
      />
      <span aria-hidden="true" className="flex items-start justify-between gap-3">
        <span
          data-trace-anchor={column === 0 ? ROW_ANCHOR : undefined}
          className={cn('mono-label tabular transition-colors duration-2', paper && ON_PAPER_MUTE)}
        >
          {pad2(number)}
        </span>
        {expandable ? (
          <Plus open={open} className={cn(paper && ON_PAPER)} />
        ) : (
          href && (
            <span className={cn('text-lg leading-none text-fg-mute', paper && ON_PAPER_MUTE)}>
              ↗
            </span>
          )
        )}
      </span>
      <span className="flex min-h-20 items-center justify-center py-3 md:min-h-24">
        {client.logo ? (
          <LogoMark
            client={client}
            tone={tone}
            live
            className="h-8 w-auto max-w-full sm:h-10 md:h-11"
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'text-center font-display text-[1.0625rem] font-semibold leading-tight [overflow-wrap:break-word] md:text-[1.25rem]',
              paper && ON_PAPER,
            )}
          >
            {client.name}
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1.5">
        <span
          className={cn(
            'font-medium leading-snug [overflow-wrap:anywhere]',
            !client.logo && 'sr-only',
            paper && ON_PAPER,
          )}
        >
          {client.name}
        </span>
        {client.industry_label && (
          <span className={cn('mono-label [overflow-wrap:anywhere]', paper && ON_PAPER_MUTE)}>
            {client.industry_label}
          </span>
        )}
      </span>
      {href && !expandable && <span className="sr-only"> · {t('common.visitSite')}</span>}
      {/* The open cell is underlined by the pen: it points at the strip below. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-trace transition-transform duration-3 ease-out group-data-[open=true]:scale-x-100 motion-reduce:transition-none"
      />
    </>
  )

  const cls = cn(
    'group relative isolate grid h-full w-full min-h-40 grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_1fr] gap-2 p-3 text-left sm:p-4 md:min-h-48 md:p-5',
    'focus-visible:outline-offset-[-3px]',
  )

  return (
    <m.li
      style={{ order }}
      className="border-b border-r border-line"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      // rows arrive as they enter the screen, a short sweep along each row
      transition={{
        duration: reduce || quick ? DUR.base : DUR.reveal,
        ease: EASE_OUT,
        delay: reduce ? 0 : column * (quick ? 0.03 : 0.05),
      }}
    >
      {expandable ? (
        <button
          ref={ref}
          type="button"
          aria-expanded={open}
          aria-controls={open ? detailId : undefined}
          data-open={open}
          onClick={onToggle}
          className={cls}
        >
          {body}
        </button>
      ) : href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </m.li>
  )
})

/** A drawn plus that turns into a cross when the strip is open (transform only). */
function Plus({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'relative mt-0.5 block h-3 w-3 flex-none text-fg-mute transition-transform duration-2 ease-out',
        open && 'rotate-45',
        className,
      )}
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
    </span>
  )
}
