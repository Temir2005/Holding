import { useTranslation } from 'react-i18next'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { CtaGroup } from '@/components/ui/Button'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Frame } from '@/components/ui/Frame'
import { Heading } from '@/components/ui/Heading'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { pad2, useSectionNumber } from './sectionNumber'
import { headingId, type SectionProps } from './types'

/** Up to this many characters the title is set in display size, longer ones in title size. */
const DISPLAY_MAX = 44

/**
 * The closing sheet: a hairline frame with crop marks, the title large, a dimension line under
 * it, and a title block in the bottom right corner that holds the buttons and the sheet number.
 * On the red tone the frame, line and buttons turn graphite through the tokens.
 */
export function CtaSection({ section }: SectionProps<'cta'>) {
  const { data } = section
  const { t } = useTranslation()
  const number = useSectionNumber()
  const media = data.media
  const title = data.title?.trim()
  const hasStamp = data.ctas.length > 0 || !!number

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={title ? headingId(section.id) : undefined}
    >
      {(data.eyebrow || number) && (
        <Reveal className="mb-10 border-b border-line pb-4 md:mb-14">
          <Eyebrow>{data.eyebrow}</Eyebrow>
        </Reveal>
      )}

      <div className="relative border border-line-strong">
        <CropMarks />
        <div
          className={cn(
            'grid grid-cols-1 gap-x-gap gap-y-10 p-5 pb-8 sm:p-8 md:p-12 lg:grid-cols-12 lg:p-16',
            media && 'lg:items-stretch',
          )}
        >
          <Reveal className={cn('flex flex-col', media ? 'lg:col-span-7' : 'lg:col-span-12')}>
            {title && (
              <Heading
                level={2}
                id={headingId(section.id)}
                size={title.length <= DISPLAY_MAX ? 'display' : 'h2'}
                className={cn(media ? 'max-w-[14ch]' : 'max-w-[18ch]')}
              >
                {title}
              </Heading>
            )}
            <DimensionLine className="mt-10 text-fg md:mt-14" />
            {data.text && <p className="mt-6 max-w-[40ch] text-lead md:mt-8">{data.text}</p>}
          </Reveal>
          {media && (
            <Frame className="lg:col-span-5">
              <ClipReveal from="left" delay={0.1}>
                <SmartImage
                  media={media}
                  crop
                  className="aspect-[4/3] lg:aspect-[5/4]"
                  sizes="(min-width: 1024px) 38vw, 100vw"
                />
              </ClipReveal>
            </Frame>
          )}
        </div>

        {hasStamp && (
          <div className="flex flex-col border-t border-line-strong md:ml-auto md:w-fit md:flex-row md:border-l">
            {data.ctas.length > 0 && (
              <div className="flex items-center p-4 md:px-6">
                <CtaGroup ctas={data.ctas} />
              </div>
            )}
            {number && (
              <dl className="grid grid-cols-2 border-line-strong max-md:border-t md:border-l">
                <StampCell label={t('sheet.sheet')} value={pad2(number.index)} />
                <StampCell label={t('sheet.sheets')} value={pad2(number.total)} last />
              </dl>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

function StampCell({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={cn(
        'flex min-w-20 flex-col justify-center gap-1 px-4 py-3',
        !last && 'border-r border-line-strong',
      )}
    >
      <dt className="mono-label">{label}</dt>
      <dd className="tabular font-mono text-[0.875rem] font-medium">{value}</dd>
    </div>
  )
}

/** Crop marks just outside the corners of the sheet frame. */
function CropMarks() {
  return (
    <>
      <span aria-hidden="true" className="crop-mark -left-3 -top-3 border-l border-t" />
      <span aria-hidden="true" className="crop-mark -right-3 -top-3 border-r border-t" />
      <span aria-hidden="true" className="crop-mark -bottom-3 -left-3 border-b border-l" />
      <span aria-hidden="true" className="crop-mark -bottom-3 -right-3 border-b border-r" />
    </>
  )
}
