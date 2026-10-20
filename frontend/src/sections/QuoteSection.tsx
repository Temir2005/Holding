import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Frame } from '@/components/ui/Frame'
import { Heading } from '@/components/ui/Heading'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { DUR, EASE_OUT } from '@/lib/motion'
import { headingId, type SectionProps } from './types'

/** The quote steps down in size as it grows, so a long one never turns into a wall. */
function quoteSize(length: number) {
  if (length <= 90) return 'text-title tracking-[-0.03em]'
  if (length <= 200)
    return 'text-[clamp(1.625rem,1rem+2vw,3.25rem)] leading-[1.08] tracking-[-0.025em]'
  return 'text-[clamp(1.375rem,1rem+1.1vw,2.25rem)] leading-[1.2] tracking-[-0.018em]'
}

/**
 * A quiet sheet between loud ones: the portrait in a frame with crop marks on the left
 * (4:5, five columns), the quote on the right with a callout leader from the portrait to the
 * opening mark, the signature in mono on a hairline at the foot of the portrait.
 * `media` of the section replaces the author's photo; without either, the plate of the tone.
 */
export function QuoteSection({ section }: SectionProps<'quote'>) {
  const { data } = section
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const text = data.text.trim()
  if (!text && !data.title) return null

  const id = headingId(section.id)
  const person = data.person ?? null
  const photo = data.media ?? person?.photo ?? null
  const size = quoteSize(text.length)
  // Smaller sizes get a longer measure, so the column keeps its shape (~22ch at the largest).
  const measure =
    text.length <= 90 ? 'max-w-[22ch]' : text.length <= 200 ? 'max-w-[26ch]' : 'max-w-[34ch]'

  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={data.title ? id : undefined}>
      <Reveal className="mb-12 border-b border-line pb-4 md:mb-24">
        <Eyebrow>{data.eyebrow}</Eyebrow>
      </Reveal>
      <figure className="grid grid-cols-12 gap-x-gap gap-y-8 lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-y-10 lg:py-8">
        {data.title && (
          <Heading
            level={2}
            size="h3"
            id={id}
            className="col-span-12 lg:col-span-6 lg:col-start-7 lg:row-start-1"
          >
            {data.title}
          </Heading>
        )}

        {text && (
          <Reveal className="relative col-span-12 lg:col-span-6 lg:col-start-7 lg:row-start-2">
            {/* Callout: from the edge of the portrait to the opening mark, drawn after it opens. */}
            <motion.span
              aria-hidden="true"
              className={cn(
                size,
                'absolute right-full top-0 hidden h-[0.55em] w-[calc((100%-5*var(--gap))/6+var(--gap)+var(--gap)*0.5)] origin-left lg:block',
              )}
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '0px 0px -10% 0px' }}
              transition={{ duration: DUR.reveal, ease: EASE_OUT, delay: reduce ? 0 : 0.5 }}
            >
              <span className="absolute -left-[4px] bottom-[-3.5px] h-2 w-2 rounded-full bg-trace" />
              <span className="absolute bottom-0 left-0 right-[0.5em] h-px bg-trace" />
            </motion.span>
            <blockquote className={cn(size, measure, 'font-normal [overflow-wrap:break-word]')}>
              <p>
                <span className="text-accent lg:absolute lg:-translate-x-full lg:pr-[0.06em]">
                  {t('quote.open')}
                </span>
                {text}
                {t('quote.close')}
              </p>
            </blockquote>
          </Reveal>
        )}

        <div className="col-span-5 md:col-span-4 lg:col-span-5 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <Frame>
            <ClipReveal>
              <SmartImage
                media={photo}
                crop
                className="aspect-[4/5]"
                sizes="(min-width: 1024px) 40vw, 40vw"
              />
            </ClipReveal>
          </Frame>
        </div>

        {person && (
          <figcaption className="col-span-7 flex flex-col gap-2 self-end border-t border-line-strong pt-4 md:col-span-6 md:col-start-6 lg:col-span-4 lg:col-start-7 lg:row-start-3">
            <span className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.06em] text-fg [overflow-wrap:break-word]">
              {person.full_name}
            </span>
            {person.position && (
              <span className="mono-label [overflow-wrap:break-word]">{person.position}</span>
            )}
          </figcaption>
        )}
      </figure>
    </Section>
  )
}
