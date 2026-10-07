import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import type { Media } from '@/api/types'
import { CtaGroup } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import type { SectionProps } from './types'

type Swatch = SectionProps<'hero'>['section']['data']['swatches'][number]

const ease = [0.2, 0.7, 0.2, 1] as const

/**
 * Two layouts, picked by content:
 * - with swatches: text beside a grid of panel samples (the "Фактура" signature);
 * - without: full-bleed photo with the text over a gradient of the deep color.
 */
export function HeroSection({ section }: SectionProps<'hero'>) {
  const { data } = section
  return data.swatches.length > 0 ? <SwatchHero section={section} /> : <BleedHero section={section} />
}

function HeroText({ section, className }: SectionProps<'hero'> & { className?: string }) {
  const { data } = section
  const reduce = useReducedMotion()
  const item = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease, delay: 0.1 + i * 0.08 },
        }
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {data.eyebrow && (
        <motion.p className="eyebrow" {...item(0)}>
          {data.eyebrow}
        </motion.p>
      )}
      {data.title && (
        <motion.h1 className="text-hero" {...item(1)}>
          {data.title}
        </motion.h1>
      )}
      {data.subtitle && (
        <motion.p className="max-w-[52ch] text-lead text-fg-mute" {...item(2)}>
          {data.subtitle}
        </motion.p>
      )}
      <motion.div {...item(3)}>
        <CtaGroup ctas={data.ctas} />
      </motion.div>
    </div>
  )
}

function SwatchHero({ section }: SectionProps<'hero'>) {
  const { data } = section
  return (
    <section
      id={section.anchor ?? undefined}
      className={`tone-${section.tone} pb-16 pt-[calc(var(--header-h)+2.5rem)] md:pb-24`}
    >
      <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <HeroText section={section} className="lg:col-span-6" />
        <SwatchGrid background={data.background} swatches={data.swatches.slice(0, 5)} />
      </Container>
    </section>
  )
}

function SwatchGrid({ background, swatches }: { background?: Media | null; swatches: Swatch[] }) {
  const reduce = useReducedMotion()
  const tiles = background ? swatches.slice(0, 5) : swatches.slice(0, 6)
  const appear = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, scale: 0.96 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.7, ease, delay: 0.25 + i * 0.07 },
        }
  return (
    <div className="grid auto-rows-[minmax(6.5rem,1fr)] grid-cols-3 gap-2 lg:col-span-6 lg:auto-rows-[minmax(8rem,1fr)]">
      {background && (
        <motion.div className="col-span-2 row-span-2 overflow-hidden rounded-tile" {...appear(0)}>
          <SmartImage media={background} fill priority sizes="(min-width: 1024px) 33vw, 66vw" />
        </motion.div>
      )}
      {tiles.map((s, i) => (
        <motion.div key={s.code} {...appear(i + 1)}>
          <SwatchTile swatch={s} />
        </motion.div>
      ))}
    </div>
  )
}

function SwatchTile({ swatch }: { swatch: Swatch }) {
  // Pick readable text for any CMS color by its luminance.
  const hex = swatch.color.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
  const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5
  return (
    <div
      className={cn(
        'relative flex h-full flex-col justify-between overflow-hidden rounded-tile p-3 font-mono text-[0.7rem]',
        light ? 'text-[#1D1E1F]' : 'text-[#EDEAE4]',
      )}
      style={{ backgroundColor: swatch.color }}
    >
      {swatch.finish === 'gloss' && (
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.3)_0%,transparent_40%)]" />
      )}
      {swatch.finish === 'texture' && (
        <span aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(100deg,rgba(0,0,0,.06)_0_3px,transparent_3px_9px)]" />
      )}
      <span className="relative opacity-80">{swatch.code}</span>
      <span className="relative font-display text-sm font-semibold">{swatch.label}</span>
    </div>
  )
}

function BleedHero({ section }: SectionProps<'hero'>) {
  const { data } = section
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '12%'])
  return (
    <section
      ref={ref}
      id={section.anchor ?? undefined}
      className="tone-dark relative isolate flex min-h-[min(88svh,52rem)] items-end overflow-hidden pb-16 pt-[calc(var(--header-h)+4rem)] md:pb-24"
    >
      <motion.div className="absolute inset-0 -z-10 scale-110" style={{ y }}>
        <SmartImage media={data.background} fill priority sizes="100vw" />
      </motion.div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(var(--deep))_15%,rgb(var(--deep)/0.55)_60%,rgb(var(--deep)/0.2)),linear-gradient(0deg,rgb(var(--deep))_0%,transparent_45%)]"
      />
      <Container>
        <HeroText section={section} className="max-w-4xl" />
      </Container>
    </section>
  )
}
