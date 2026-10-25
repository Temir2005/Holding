import { Ctas, Eyebrow, Facts, Lines } from '@/components/site/kit'
import { useReady } from '@/components/site/hooks'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import type { SectionProps } from './types'

/**
 * Full-bleed photo (or video), a heading that slides up line by line, buttons and figures.
 * An overlay picture (the aircraft) flies into frame and then hovers.
 */
export function HeroSection({ section }: SectionProps<'hero'>) {
  const d = section.data
  const ready = useReady()
  return (
    <section
      id={section.anchor ?? undefined}
      className={cn('hero', d.overlay && 'hero--overlay', ready && 'ready')}
      aria-labelledby={`h-${section.id}`}
    >
      <div className="hero__bg">
        {d.video ? (
          <video
            src={d.video.url}
            poster={d.background?.url}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        ) : (
          <SmartImage media={d.background} fill priority sizes="100vw" />
        )}
      </div>
      {d.overlay && (
        <div className="hero__overlay">
          <img
            src={d.overlay.url}
            alt={d.overlay.alt}
            width={d.overlay.width}
            height={d.overlay.height}
          />
        </div>
      )}
      <div className="wrap hero__in">
        <Eyebrow className="fade-up">{d.eyebrow}</Eyebrow>
        {d.title && (
          <h1 className="h1" id={`h-${section.id}`}>
            <Lines text={d.title} />
          </h1>
        )}
        {d.subtitle && <p className="lead fade-up">{d.subtitle}</p>}
        <Ctas ctas={d.ctas} className="fade-up" />
        {d.stats.length > 0 && <Facts stats={d.stats} className="fade-up" />}
      </div>
    </section>
  )
}
