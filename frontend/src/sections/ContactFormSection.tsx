import { useTranslation } from 'react-i18next'
import { useSettings } from '@/api/queries'
import { LeadForm } from '@/components/forms/LeadForm'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { phoneHref, whatsappHref } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import { headingId, type SectionProps } from './types'

export function ContactFormSection({ section }: SectionProps<'contact_form'>) {
  const { data } = section
  const { t } = useTranslation()
  const contacts = useSettings(useLocale()).data?.contacts

  return (
    <Section tone={section.tone} anchor={section.anchor} labelledBy={headingId(section.id)}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-5">
          <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} intro={data.text} className="!mb-0" />
          {contacts && (
            <Reveal>
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <ContactRow label={t('contacts.address')}>{contacts.address}</ContactRow>
                {contacts.phones.map((p) => (
                  <ContactRow key={p} label={t('contacts.phone')}>
                    <a href={phoneHref(p)} className="hover:text-accent-ink">{p}</a>
                  </ContactRow>
                ))}
                {contacts.email && (
                  <ContactRow label={t('contacts.email')}>
                    <a href={`mailto:${contacts.email}`} className="hover:text-accent-ink">{contacts.email}</a>
                  </ContactRow>
                )}
                {contacts.whatsapp && (
                  <ContactRow label={t('contacts.whatsapp')}>
                    <a href={whatsappHref(contacts.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:text-accent-ink">
                      {contacts.whatsapp}
                    </a>
                  </ContactRow>
                )}
                {contacts.hours && <ContactRow label={t('contacts.hours')}>{contacts.hours}</ContactRow>}
              </dl>
            </Reveal>
          )}
        </div>
        <Reveal delay={0.1} className="lg:col-span-7">
          <LeadForm
            key={section.id}
            leadTypes={data.lead_types}
            defaultType={data.default_type}
            consentText={data.consent_text}
            successText={data.success_text}
          />
        </Reveal>
      </div>
    </Section>
  )
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-xs uppercase tracking-[0.06em] text-fg-mute">{label}</dt>
      <dd className="text-lg">{children}</dd>
    </div>
  )
}
