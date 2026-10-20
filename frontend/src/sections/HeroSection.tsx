import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { Media, Stat } from '@/api/types'
import { useSettings } from '@/api/queries'
import { anchor, type TracePath } from '@/components/trace/paths'
import { CtaGroup } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { SmartImage } from '@/components/ui/SmartImage'
import { formatNumber } from '@/lib/format'
import { buildImageUrl } from '@/lib/image'
import { LOCALE_LABELS, useLocale } from '@/lib/locale'
import { DUR, EASE_OUT } from '@/lib/motion'
import { sheetOf } from '@/lib/sheets'
import { pad2, useSectionNumber } from './sectionNumber'
import { headingId, type SectionProps } from './types'

/** First block of a page: the line is born on the datum «±0,000». Elsewhere it passes through. */
const fromDatum: TracePath = (box) => {
  const datum = anchor(box, 'datum')
  return datum ? `M ${box.x} ${datum.y} V ${box.h}` : `M ${box.x} 0 V ${box.h}`
}

/**
 * The first screen as a drawing sheet: a manifest heading, the datum line «±0,000» where the
 * red line starts, a narrow column with the subtitle and actions, and a large shot of the object
 * that runs out to the window edge, with the stamp of the sheet in its corner.
 * LCP rule: the heading and the shot are visible from the first frame; only the datum line,
 * the crop marks and the stamp details move.
 */
export function HeroSection({ section }: SectionProps<'hero'>) {
  const { data } = section
  const first = useSectionNumber()?.index === 1
  const titleId = headingId(section.id)

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? titleId : undefined}
      space="none"
      trace={first ? fromDatum : undefined}
    >
      <div className="flex min-h-[100svh] flex-col pb-section-y-end pt-[calc(var(--header-h)+clamp(40px,4.4vw,72px))] min-[1081px]:pb-0">
        {data.title && (
          <h1
            id={titleId}
            className="max-w-[11.5em] text-display font-heading [overflow-wrap:break-word]"
          >
            {data.title}
          </h1>
        )}
        <Datum origin={first} />
        <div className="grid flex-1 grid-cols-12 gap-x-gap gap-y-8 min-[1081px]:grid-rows-[minmax(0,1fr)]">
          <div className="col-span-12 grid content-start gap-8 md:col-span-7 min-[1081px]:col-span-3">
            {data.subtitle && <p className="text-lead">{data.subtitle}</p>}
            <div className="[&_a]:w-full [&_a]:sm:w-auto min-[1081px]:[&_a]:w-full">
              <CtaGroup ctas={data.ctas} />
            </div>
            <HeroStats stats={data.stats.slice(0, 3)} />
          </div>
          <HeroFigure media={data.background} video={data.video} eyebrow={data.eyebrow} />
        </div>
      </div>
    </Section>
  )
}

/** The datum: a horizontal red line from the margin to the right edge, «±0,000» at its end. */
function Datum({ origin }: { origin: boolean }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <div className="relative my-[clamp(24px,3vw,48px)] ml-[calc(var(--trace-x)-var(--pad-l))] mb-[clamp(32px,3.4vw,56px)] h-px max-sm:mt-12">
      <span
        data-trace-anchor="datum"
        aria-hidden="true"
        className="absolute left-0 top-0 h-px w-0"
      />
      {origin && (
        <span
          aria-hidden="true"
          className="absolute -left-[6px] -top-[6px] h-3 w-3 rounded-full border-[1.5px] border-trace bg-surface"
        />
      )}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-trace"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: DUR.draw, ease: EASE_OUT, delay: 0.1 }}
      />
      <span className="mono-label absolute bottom-2.5 right-0 pr-6">
        {t('sheet.datum')}
        <span
          aria-hidden="true"
          className="absolute -bottom-2.5 right-0.5 h-2 w-3 bg-trace [clip-path:polygon(0_0,100%_0,50%_100%)]"
        />
      </span>
    </div>
  )
}

/** Up to three figures beside the heading (hero.stat_ids), as a short dimension chain. */
function HeroStats({ stats }: { stats: Stat[] }) {
  const locale = useLocale()
  if (!stats.length) return null
  return (
    <dl className="grid gap-4 border-t border-line pt-4">
      {stats.map((s) => (
        <div key={s.id} className="grid grid-cols-[auto_1fr] items-baseline gap-x-4">
          <dd className="tabular text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)] font-heading leading-none tracking-[-0.045em]">
            {s.prefix && <span className="mr-1 text-[0.6em] font-medium">{s.prefix}</span>}
            {formatNumber(s.value, locale)}
            {s.suffix && (
              <span className="ml-1 text-[0.45em] font-medium text-fg-mute">{s.suffix}</span>
            )}
          </dd>
          <dt className="row-start-1 col-start-2 text-sm text-fg-mute">{s.label}</dt>
        </div>
      ))}
    </dl>
  )
}

/**
 * The shot: nine columns on wide screens, out to the right edge of the window, down to the
 * bottom of the first screen. Video when the editor set one (not with reduced motion).
 */
function HeroFigure({
  media,
  video,
  eyebrow,
}: {
  media: Media | null | undefined
  video: Media | null | undefined
  eyebrow: string | null | undefined
}) {
  const reduce = useReducedMotion()
  return (
    <figure className="relative col-span-12 flex min-h-0 flex-col max-[1080px]:mr-0 min-[1081px]:col-span-9 min-[1081px]:col-start-4 min-[1081px]:row-start-1 min-[1081px]:mr-[calc(var(--pad-r)*-1)] min-[1081px]:min-h-[clamp(320px,46svh,640px)]">
      <div className="relative aspect-[3/2] w-full flex-1 md:aspect-[16/9] min-[1081px]:aspect-auto">
        {video && !reduce ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={buildImageUrl(video)}
            poster={media ? buildImageUrl(media) : undefined}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        ) : (
          <SmartImage
            media={media}
            fill
            priority
            sizes="(min-width: 1081px) 75vw, 100vw"
            className="absolute inset-0"
          />
        )}
        <CropMarks />
      </div>
      <HeroStamp eyebrow={eyebrow} />
    </figure>
  )
}

/** Crop marks of the frame: drawn in after the shot is already on screen. */
function CropMarks() {
  const reduce = useReducedMotion()
  const marks = [
    '-left-2 -top-2 border-l border-t',
    '-right-2 -top-2 border-r border-t min-[1081px]:hidden',
    '-bottom-2 -left-2 border-b border-l',
    '-bottom-2 -right-2 border-b border-r min-[1081px]:hidden',
  ]
  return (
    <>
      {marks.map((pos, i) => (
        <motion.span
          key={pos}
          aria-hidden="true"
          className={`crop-mark ${pos}`}
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: DUR.step, ease: EASE_OUT, delay: 0.3 + i * 0.06 }}
        />
      ))}
    </>
  )
}

/** The stamp of the sheet in the corner of the shot: site name, eyebrow, sheet, language. */
function HeroStamp({ eyebrow }: { eyebrow: string | null | undefined }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const settings = useSettings(locale).data
  const { pathname } = useLocation()
  if (!settings) return null
  const sheet = sheetOf(settings.navigation, pathname)
  const cell = 'grid content-start gap-1 border-l border-t border-line px-3 py-2'
  return (
    <div className="tone-dark grid border-line-strong bg-surface text-fg max-[1080px]:border max-[1080px]:border-t-0 min-[1081px]:absolute min-[1081px]:bottom-0 min-[1081px]:right-0 min-[1081px]:w-[min(100%,520px)] min-[1081px]:border-l min-[1081px]:border-t grid-cols-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <div className="col-span-3 grid content-between gap-2 px-3 py-2 sm:col-span-1 sm:row-span-2">
        <p className="font-bold tracking-[-0.02em]">{settings.site_name}</p>
        {eyebrow && <p className="mono-label">{eyebrow}</p>}
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
      <div className={`${cell} max-sm:border-l-0 sm:col-span-2`}>
        <span className="mono-label">{t('sheet.language')}</span>
        <span className="text-sm">{LOCALE_LABELS[locale]}</span>
      </div>
    </div>
  )
}
