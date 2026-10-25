import { useTranslation } from 'react-i18next'
import { Eyebrow, Sec } from '@/components/site/kit'
import { SiteLink } from '@/components/ui/SiteLink'
import { pagePath, useLocale } from '@/lib/locale'
import type { SectionProps } from './types'

/** Client logos in a running line: grey, in colour on hover; pauses under the pointer. */
export function ClientsMarqueeSection({ section }: SectionProps<'clients_marquee'>) {
  const { t } = useTranslation()
  const locale = useLocale()
  const d = section.data
  if (!d.clients.length) return null
  const row = (copy: number) =>
    d.clients.map((c) => (
      <span key={`${c.id}-${copy}`}>
        {c.logo && <img src={c.logo.url} alt="" width={26} height={26} />}
        {c.name}
      </span>
    ))
  return (
    <Sec tone={section.tone} anchor={section.anchor} bare className="cl">
      <div className="wrap cl__head">
        <Eyebrow>{d.eyebrow ?? d.title}</Eyebrow>
        <SiteLink to={pagePath(locale, 'clients')} className="btn btn--ink">
          {t('ui.allClients')}
        </SiteLink>
      </div>
      <p className="sr-only">{d.clients.map((c) => c.name).join(', ')}</p>
      <div className="marq" aria-hidden="true">
        {row(1)}
        {row(2)}
      </div>
    </Sec>
  )
}
