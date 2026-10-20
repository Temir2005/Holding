import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { Markdown } from '@/components/ui/Markdown'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { headingId, type SectionProps } from './types'

/**
 * Editorial text block. The header spans the sheet, so the title never squeezes into a half
 * column; the body keeps a 60–70 character measure. `media_left` / `media_right`: a framed
 * shot on six columns beside five of text (a missing shot leaves the plate of the tone);
 * `text_only`: the text is indented to the fifth column like a note on the drawing.
 */
export function AboutTextSection({ section }: SectionProps<'about_text'>) {
  const { data } = section
  const withMedia = data.layout !== 'text_only'
  const mediaLeft = data.layout === 'media_left'
  const body = data.body.trim()
  if (!body && !data.title && !(withMedia && data.media)) return null

  const text = body && (
    <Reveal
      key="text"
      className={cn(
        'min-w-0',
        withMedia
          ? cn('lg:col-span-5 lg:row-start-1', mediaLeft ? 'lg:col-start-8' : 'lg:col-start-1')
          : 'lg:col-span-7 lg:col-start-5',
      )}
    >
      <Markdown variant="sheet">{body}</Markdown>
    </Reveal>
  )
  const figure = withMedia && (
    <Frame
      key="media"
      className={cn(
        'lg:col-span-6 lg:row-start-1 lg:self-start',
        mediaLeft ? 'lg:col-start-1' : 'lg:col-start-7',
      )}
    >
      <ClipReveal from="left">
        <SmartImage
          media={data.media}
          crop
          className="aspect-[4/3]"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </ClipReveal>
    </Frame>
  )

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
    >
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      {(text || figure) && (
        <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-12 lg:gap-x-gap">
          {/* reading order follows the layout: the shot comes first when it stands on the left */}
          {mediaLeft ? [figure, text] : [text, figure]}
        </div>
      )}
    </Section>
  )
}
