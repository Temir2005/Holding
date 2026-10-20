import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { buildImageUrl } from '@/lib/image'
import { headingId, type SectionProps } from './types'

/** "https://www.youtube.com/embed/…" → "youtube.com"; null for a broken URL. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** The embed URL asked to start playing: it is only loaded after the click on play. */
function autoplayUrl(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('autoplay', '1')
    return u.toString()
  } catch {
    return url
  }
}

/** The player takes the focus from the play button it replaces. */
const focusOnMount = (el: HTMLElement | null) => el?.focus()

/**
 * A film in a frame with crop marks: the poster from the CMS (or the plate of the tone) and a
 * large square play button. Nothing third-party loads until the click: the embed iframe or the
 * video file replaces the poster only then and gets the focus. No autoplay of any kind.
 */
export function VideoSection({ section }: SectionProps<'video'>) {
  const { data } = section
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const title = data.title?.trim()
  const embed = data.embed_url?.trim() || null
  const file = embed ? null : (data.video ?? null)
  const playable = !!embed || !!file
  const host = embed ? hostOf(embed) : null

  if (!playable && !title) return null
  const name = title || t('video.title')

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={title ? headingId(section.id) : undefined}
    >
      <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={title} />
      <Frame
        caption={!playable ? t('video.empty') : host ? t('video.source', { host }) : undefined}
      >
        <ClipReveal>
          <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
            {playing && embed ? (
              <iframe
                ref={focusOnMount}
                src={autoplayUrl(embed)}
                title={name}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : playing && file ? (
              <video
                ref={focusOnMount}
                controls
                autoPlay
                playsInline
                preload="auto"
                poster={data.poster ? buildImageUrl(data.poster, { width: 1600 }) : undefined}
                className="absolute inset-0 h-full w-full bg-graphite object-contain"
              >
                <source src={file.url} type={file.mime_type} />
              </video>
            ) : (
              <>
                <SmartImage media={data.poster} fill sizes="(min-width: 1024px) 85vw, 100vw" />
                {playable && (
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={`${t('a11y.playVideo')}: ${name}`}
                    className="group/play absolute inset-0 grid place-items-center focus-visible:outline-offset-[-6px]"
                  >
                    <PlayMark />
                  </button>
                )}
              </>
            )}
          </div>
        </ClipReveal>
      </Frame>
    </Section>
  )
}

/**
 * The play button of the system: a solid graphite square (never glass over the photo) with a
 * drawn triangle; on hover and focus the square inverts and its crop marks step out.
 */
function PlayMark() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid h-16 w-16 place-items-center border border-chalk/30 bg-graphite text-chalk md:h-28 md:w-28',
        'transition-colors duration-2 ease-out group-hover/play:bg-chalk group-hover/play:text-graphite group-focus-visible/play:bg-chalk group-focus-visible/play:text-graphite',
      )}
    >
      {(
        [
          '-left-2 -top-2 border-l border-t',
          '-right-2 -top-2 border-r border-t',
          '-bottom-2 -left-2 border-b border-l',
          '-bottom-2 -right-2 border-b border-r',
        ] as const
      ).map((pos) => (
        <span
          key={pos}
          className={cn(
            'absolute h-3 w-3 border-chalk opacity-0 transition-[opacity,transform] duration-2 ease-out group-hover/play:opacity-100 group-focus-visible/play:opacity-100 motion-safe:scale-75 motion-safe:group-hover/play:scale-100',
            pos,
          )}
        />
      ))}
      <svg width="28" height="32" viewBox="0 0 28 32" className="ml-1 h-6 w-6 md:h-8 md:w-8">
        <path
          d="M1 1.5L26.5 16L1 30.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="miter"
        />
      </svg>
    </span>
  )
}
