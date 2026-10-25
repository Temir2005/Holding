import { Eyebrow, Head, Sec } from '@/components/site/kit'
import { Markdown } from '@/components/ui/Markdown'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** Text; with a picture it is a full-bleed photo with the text on it, never a photo beside text. */
export function AboutTextSection({ section }: SectionProps<'about_text'>) {
  const d = section.data
  if (d.media && d.layout !== 'text_only')
    return (
      <Sec
        tone="dark"
        anchor={section.anchor}
        bare
        className={d.layout === 'media_left' ? 'bleed bleed--right' : 'bleed'}
        label={d.title}
      >
        <div className="bleed__bg">
          <SmartImage media={d.media} fill sizes="100vw" />
        </div>
        <div className="wrap">
          <div className="bleed__txt">
            <Eyebrow>{d.eyebrow}</Eyebrow>
            {d.title && <h2 className="h2">{d.title}</h2>}
            <Markdown className="bleed__md" demoteHeadings>
              {d.body}
            </Markdown>
          </div>
        </div>
      </Sec>
    )
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
        <Markdown className="lead" demoteHeadings>
          {d.body}
        </Markdown>
      </div>
    </Sec>
  )
}
