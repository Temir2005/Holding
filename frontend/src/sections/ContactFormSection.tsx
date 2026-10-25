import { LeadForm } from '@/components/forms/LeadForm'
import { Eyebrow } from '@/components/site/kit'
import { SmartImage } from '@/components/ui/SmartImage'
import type { SectionProps } from './types'

/** The lead form as a white card over the section photo. */
export function ContactFormSection({ section }: SectionProps<'contact_form'>) {
  const d = section.data
  return (
    <section
      id={section.anchor ?? undefined}
      className="contact"
      aria-labelledby={`h-${section.id}`}
    >
      {d.background && (
        <div className="contact__bg">
          <SmartImage media={d.background} fill sizes="100vw" />
        </div>
      )}
      <div className="wrap">
        <div>
          <Eyebrow>{d.eyebrow}</Eyebrow>
          {d.title && (
            <h2 className="h2" id={`h-${section.id}`}>
              {d.title}
            </h2>
          )}
          {d.text && <p className="lead">{d.text}</p>}
        </div>
        <LeadForm
          leadTypes={d.lead_types}
          defaultType={d.default_type}
          consentText={d.consent_text}
          successText={d.success_text}
        />
      </div>
    </section>
  )
}
