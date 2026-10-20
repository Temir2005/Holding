import { useTranslation } from 'react-i18next'
import type { Client, Tone } from '@/api/types'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { pad2 } from '../sectionNumber'
import { LogoMark } from './LogoMark'
import { MARK_ANCHOR } from './trace'

/** The quote steps down as it grows; many quotes start one step smaller. */
function quoteSize(length: number, dense: boolean) {
  if (!dense && length <= 140) return 'text-title tracking-[-0.03em]'
  if (length <= (dense ? 140 : 280))
    return 'text-[clamp(1.5rem,1rem+1.6vw,2.75rem)] leading-[1.1] tracking-[-0.022em]'
  return 'text-[clamp(1.25rem,1rem+0.8vw,1.875rem)] leading-[1.25] tracking-[-0.015em]'
}

type Props = {
  client: Client
  index: number
  tone: Tone
  /** Many quotes: smaller type, the signature beside the quote, no alternation. */
  dense: boolean
  /** Odd sheets stand off the margin by three columns: the callouts alternate in length. */
  flip: boolean
}

/**
 * One testimonial as a sheet: a title strip (number, client, industry, small logo) on a
 * hairline, the quote in large regular type with a hanging opening mark, and the signature in
 * mono on a strong hairline.
 */
export function Testimonial({ client, index, tone, dense, flip }: Props) {
  const { t } = useTranslation()
  const quote = client.testimonial
  if (!quote) return null
  const text = quote.quote.trim()
  const size = quoteSize(text.length, dense)
  const measure = dense ? 'max-w-[34ch]' : text.length <= 140 ? 'max-w-[24ch]' : 'max-w-[30ch]'

  return (
    <li>
      <figure className="grid grid-cols-12 gap-x-gap gap-y-8 md:gap-y-10">
        <Reveal className="col-span-12 flex items-start justify-between gap-6 border-t md:items-center border-line pt-4">
          <p className="mono-label flex min-w-0 flex-wrap gap-x-8 gap-y-1">
            <span aria-hidden="true" className="tabular text-fg">
              {pad2(index + 1)}
            </span>
            <span className="[overflow-wrap:anywhere]">{client.name}</span>
            {client.industry_label && (
              <span className="[overflow-wrap:anywhere]">{client.industry_label}</span>
            )}
          </p>
          <LogoMark
            client={client}
            tone={tone}
            className="h-5 w-auto max-w-[6rem] md:h-6 md:max-w-[8rem]"
          />
        </Reveal>

        <Reveal
          className={cn(
            'relative col-span-12 lg:row-start-2',
            dense
              ? 'md:col-span-10 lg:col-span-7 lg:col-start-2'
              : flip
                ? 'lg:col-span-8 lg:col-start-5'
                : 'lg:col-span-9 lg:col-start-2',
          )}
        >
          <blockquote className={cn(size, measure, 'font-normal [overflow-wrap:break-word]')}>
            <p>
              <span
                data-trace-anchor={MARK_ANCHOR}
                className="text-accent lg:absolute lg:right-full lg:top-0 lg:pr-[0.06em]"
              >
                {t('quote.open')}
              </span>
              {text}
              {t('quote.close')}
            </p>
          </blockquote>
        </Reveal>

        <figcaption
          className={cn(
            'col-span-12 flex flex-col gap-2 border-t border-line-strong pt-4 sm:col-span-8 md:col-span-6',
            dense
              ? 'lg:col-span-3 lg:col-start-10 lg:row-start-2 lg:self-end'
              : flip
                ? 'lg:col-span-4 lg:col-start-5'
                : 'lg:col-span-4 lg:col-start-2',
          )}
        >
          <span className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.06em] text-fg [overflow-wrap:break-word]">
            {quote.author}
          </span>
          {quote.position && (
            <span className="mono-label [overflow-wrap:break-word]">{quote.position}</span>
          )}
        </figcaption>
      </figure>
    </li>
  )
}
