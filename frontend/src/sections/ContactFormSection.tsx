import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/api/queries'
import { LeadForm } from '@/components/forms/LeadForm'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { phoneHref, whatsappHref } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import { headingId, type SectionProps } from './types'

const digits = (s: string) => s.replace(/\D/g, '')

/**
 * Contacts on the left, set large like the footer's, and a short form on the right.
 * Both columns stack on a phone, the contacts first.
 */
export function ContactFormSection({ section }: SectionProps<'contact_form'>) {
  const { data } = section
  const { t } = useTranslation()
  const contacts = useSettings(useLocale()).data?.contacts
  // WhatsApp is stored as bare digits. When it is one of the phones, it rides on that row as a
  // small link instead of repeating the same number.
  const wa = contacts?.whatsapp ?? null
  const waPhone = wa ? contacts?.phones.find((p) => digits(p) === digits(wa)) : undefined

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? headingId(section.id) : undefined}
    >
      <SectionHeader
        id={headingId(section.id)}
        eyebrow={data.eyebrow}
        title={data.title}
        intro={data.text}
      />
      <div className="grid grid-cols-1 gap-x-gap gap-y-14 lg:grid-cols-12">
        {contacts && (
          <Reveal className="lg:col-span-5">
            <dl className="border-t border-fg">
              {contacts.address && <Row label={t('contacts.address')}>{contacts.address}</Row>}
              {contacts.phones.map((p) => (
                <Row key={p} label={t('contacts.phone')}>
                  <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <a href={phoneHref(p)} className="link-draw tabular">
                      {p}
                    </a>
                    {wa && p === waPhone && (
                      <a
                        href={whatsappHref(wa)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono-label link-draw text-fg"
                      >
                        {t('contacts.whatsapp')}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    )}
                  </span>
                </Row>
              ))}
              {contacts.email && (
                <Row label={t('contacts.email')}>
                  <a
                    href={`mailto:${contacts.email}`}
                    className="link-draw [overflow-wrap:anywhere]"
                  >
                    {contacts.email}
                  </a>
                </Row>
              )}
              {wa && !waPhone && (
                <Row label={t('contacts.whatsapp')}>
                  <a
                    href={whatsappHref(wa)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-draw tabular"
                  >
                    {wa}
                  </a>
                </Row>
              )}
              {contacts.hours && (
                <Row label={t('contacts.hours')} small>
                  {contacts.hours}
                </Row>
              )}
            </dl>
          </Reveal>
        )}
        <Reveal
          delay={0.08}
          className={contacts ? 'lg:col-span-6 lg:col-start-7' : 'lg:col-span-7'}
        >
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

function Row({ label, children, small }: { label: string; children: ReactNode; small?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-line py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline sm:gap-4 md:py-5">
      <dt className="mono-label">{label}</dt>
      <dd className={small ? 'text-body text-fg-mute' : 'text-subtitle font-medium'}>{children}</dd>
    </div>
  )
}
