import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { SiteSettings } from '@/api/types'
import { anchor, type TraceBranches, type TracePath } from '@/components/trace/paths'
import { TraceSegment } from '@/components/trace/TraceSegment'
import { phoneHref, whatsappHref } from '@/lib/format'
import { LOCALE_LABELS, useLocale } from '@/lib/locale'
import { sheetOf } from '@/lib/sheets'
import { pad2 } from '@/sections/sectionNumber'
import { NavLinks } from './NavLinks'

/** The line comes down the margin, turns into the title block and ends with a mark there. */
const toStamp: TracePath = (box) => {
  const end = anchor(box, 'stamp')
  return `M ${box.x} 0 V ${end ? end.y : box.h}`
}
const intoStamp: TraceBranches = (box) => {
  const end = anchor(box, 'stamp')
  return end ? [{ d: `M ${box.x} ${end.y} H ${end.x}`, at: end.y }] : []
}

/**
 * Footer as the title block of a drawing: a sheet frame, the sheet register (the navigation),
 * contacts, and the stamp with the requisites and «Лист NN / Листов NN». Both numbers come from
 * the navigation in the CMS settings (lib/sheets), never hard-coded.
 */
export function Footer({ settings }: { settings: SiteSettings | undefined }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  if (!settings) return null
  const { contacts, footer, socials, navigation, site_name: name } = settings
  const sheet = sheetOf(navigation, pathname)

  return (
    <footer id="footer" className="tone-dark sheet relative pb-10 pt-16 md:pt-24">
      <TraceSegment path={toStamp} branches={intoStamp} />
      <div className="mx-auto max-w-sheet pl-pad-l pr-pad-r">
        <div className="relative border border-line-strong">
          <div className="grid gap-12 p-6 md:p-10 lg:grid-cols-12 lg:gap-x-gap">
            <div className="grid content-start gap-10 lg:col-span-7">
              <p className="text-[clamp(2.25rem,1.4rem+3.6vw,4.5rem)] font-heading leading-none tracking-[-0.04em]">
                {name}
              </p>
              {footer.text && <p className="max-w-[44ch] text-fg-mute">{footer.text}</p>}
              {navigation.length > 0 && (
                <nav aria-label={t('sheet.register')} className="grid gap-3">
                  <p className="mono-label border-b border-line pb-3">{t('sheet.register')}</p>
                  <NavLinks
                    items={navigation}
                    className="grid gap-x-gap sm:grid-cols-2"
                    linkClassName="grid grid-cols-[5.5rem_1fr] items-baseline border-b border-line py-3 font-medium"
                    renderPrefix={(i) => (
                      <span aria-hidden="true" className="mono-label">
                        {t('sheet.sheet')} {pad2(i + 1)}
                      </span>
                    )}
                  />
                </nav>
              )}
            </div>

            <address className="grid content-start gap-3 not-italic lg:col-span-4 lg:col-start-9">
              <p className="mono-label border-b border-line pb-3">{t('sheet.contacts')}</p>
              <p className="text-lead">{contacts.address}</p>
              {contacts.phones.map((p) => (
                <a key={p} href={phoneHref(p)} className="link-draw w-fit text-lead">
                  {p}
                </a>
              ))}
              {contacts.email && (
                <a href={`mailto:${contacts.email}`} className="link-draw w-fit text-lead">
                  {contacts.email}
                </a>
              )}
              {contacts.whatsapp && (
                <a
                  href={whatsappHref(contacts.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-draw hit-area w-fit"
                >
                  {t('contacts.whatsapp')}
                </a>
              )}
              {contacts.hours && <p className="text-fg-mute">{contacts.hours}</p>}
              {socials.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {socials.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono-label link-draw hit-area text-fg"
                      >
                        {s.type}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </address>
          </div>

          <Stamp name={name} legal={footer.legal} sheet={sheet} t={t} />
        </div>
      </div>
    </footer>
  )
}

function Stamp({
  name,
  legal,
  sheet,
  t,
}: {
  name: string
  legal: string
  sheet: { number: number | null; total: number }
  t: (key: string) => string
}) {
  const locale = useLocale()
  const cell = 'grid content-start gap-1 border-l border-t border-line px-3 py-2'
  return (
    <div className="grid grid-cols-4 border-t border-line-strong sm:ml-auto sm:w-[min(100%,560px)] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:border-l">
      {/* The line of the page ends here: the anchor sits on the stamp's left edge. */}
      <div className="relative col-span-4 grid content-between gap-2 px-3 py-2 sm:col-span-1 sm:row-span-2">
        <span
          data-trace-anchor="stamp"
          aria-hidden="true"
          className="absolute -left-px top-4 h-0 w-0"
        />
        <span aria-hidden="true" className="absolute -left-[5px] top-[12px] h-2 w-2 bg-trace" />
        <p className="font-bold tracking-[-0.02em]">{name}</p>
        {legal && <p className="mono-label normal-case tracking-normal">{legal}</p>}
      </div>
      <div className={cell}>
        <span className="mono-label">{t('sheet.sheet')}</span>
        <span className="tabular text-sm">
          {sheet.number ? pad2(sheet.number) : t('sheet.noNumber')}
        </span>
      </div>
      <div className={cell}>
        <span className="mono-label">{t('sheet.sheets')}</span>
        <span className="tabular text-sm">{pad2(sheet.total)}</span>
      </div>
      <div className={cell}>
        <span className="mono-label">{t('sheet.language')}</span>
        <span className="text-sm">{LOCALE_LABELS[locale]}</span>
      </div>
      <div className={cell}>
        <span className="mono-label">{t('sheet.year')}</span>
        <span className="tabular text-sm">{new Date().getFullYear()}</span>
      </div>
    </div>
  )
}
