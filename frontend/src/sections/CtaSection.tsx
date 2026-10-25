import { Ctas, Sec } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** A call to action: heading, text and buttons; with a photo it sits on the photo. */
export function CtaSection({ section }: SectionProps<'cta'>) {
  const d = section.data
  if (d.media)
    return (
      <Sec tone="dark" anchor={section.anchor} bare className="bleed">
        <div className="bleed__bg">
          <SmartImage media={d.media} fill sizes="100vw" />
        </div>
        <div className="wrap">
          <div className="bleed__txt">
            {d.title && <h2 className="h2">{d.title}</h2>}
            {d.text && <p className="lead">{d.text}</p>}
            <Ctas ctas={d.ctas} />
          </div>
        </div>
      </Sec>
    )
  return (
    <Sec tone={section.tone} anchor={section.anchor} className="cta">
      <div className="wrap">
        <div>
          {d.title && <h2 className="h2">{d.title}</h2>}
          {d.text && <p className="lead">{d.text}</p>}
        </div>
        <Ctas ctas={d.ctas} onDark={section.tone !== 'light'} className="" />
      </div>
    </Sec>
  )
}
