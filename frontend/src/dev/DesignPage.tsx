/*
 * /dev/design — every token and component of the design system on the three tones.
 * Dev only: the route is registered under import.meta.env.DEV, so this chunk is not built for
 * production. Also the bench of the line contract: shuffle the sheets and the line must not break.
 */
import { motion, useTransform } from 'framer-motion'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Tone } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { CountUp } from '@/components/motion/CountUp'
import { pinnedHeight, usePinnedSteps } from '@/components/motion/usePinnedSteps'
import type { TracePath } from '@/components/trace/paths'
import { CmsLink, MoreLink } from '@/components/ui/Button'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Frame } from '@/components/ui/Frame'
import { Heading } from '@/components/ui/Heading'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { StatusMark } from '@/components/ui/StatusMark'
import { Tag } from '@/components/ui/Tag'
import { formatNumber } from '@/lib/format'
import { SectionNumberContext } from '@/sections/sectionNumber'
import { LABELS, SAMPLE, SAMPLE_MEDIA, TONES } from './fixtures'

const SEMANTIC = [
  'surface',
  'surface-2',
  'fg',
  'fg-mute',
  'line',
  'line-strong',
  'plate',
  'trace',
  'accent',
  'on-accent',
]
const fmt = (n: number) => formatNumber(n, 'ru')

export function Component() {
  return (
    <>
      <Numbered index={1} total={4}>
        <Section tone="light" anchor="tokens">
          <SectionHeader eyebrow={LABELS.tokens} title="Tokens" />
          <div className="grid gap-gap md:grid-cols-3">
            {TONES.map((tone) => (
              <Swatches key={tone} tone={tone} />
            ))}
          </div>
        </Section>
      </Numbered>

      <Numbered index={2} total={4}>
        <Section tone="dark" anchor="type">
          <SectionHeader eyebrow={LABELS.type} title={SAMPLE.ru} intro={SAMPLE.lead} />
          <TypeScale />
        </Section>
      </Numbered>

      {TONES.map((tone, i) => (
        <Numbered key={tone} index={3} total={4}>
          <Section tone={tone} anchor={`components-${tone}`} trace={i === 1 ? jog : undefined}>
            <SectionHeader
              eyebrow={`${LABELS.components} · ${tone}`}
              title={SAMPLE.ru}
              aside={<MoreLink href="#tokens">{LABELS.more}</MoreLink>}
            />
            <Components />
          </Section>
        </Numbered>
      ))}

      <TraceBench />
      <PinnedDemo />
    </>
  )
}

function Numbered({
  index,
  total,
  children,
}: {
  index: number
  total: number
  children: ReactNode
}) {
  return (
    <SectionNumberContext.Provider value={{ index, total }}>
      {children}
    </SectionNumberContext.Provider>
  )
}

function Swatches({ tone }: { tone: Tone }) {
  return (
    <div className={`tone-${tone} border border-line p-4`}>
      <p className="mono-label mb-4 text-fg">tone-{tone}</p>
      <ul className="grid gap-2">
        {SEMANTIC.map((name) => (
          <li key={name} className="flex items-center gap-3">
            <span
              className="h-6 w-10 flex-none border border-line"
              style={{ background: `rgb(var(--${name}))` }}
            />
            <span className="mono-label">--{name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TypeScale() {
  const rows: [string, string, ReactNode][] = [
    ['display', 'text-display font-heading', SAMPLE.ru],
    ['display · kk', 'text-display font-heading', <span lang="kk">{SAMPLE.kk}</span>],
    ['title', 'text-title font-heading', SAMPLE.ru],
    ['subtitle', 'text-subtitle font-semibold', SAMPLE.en],
    ['stat-hero', 'text-stat-hero font-heading tabular', '20+'],
    ['stat-lg', 'text-stat-lg font-heading tabular', fmt(30000)],
    ['lead', 'text-lead', SAMPLE.lead],
    ['body', 'text-body', SAMPLE.body],
    ['body · kk', 'text-body', <span lang="kk">{SAMPLE.kkLong}</span>],
    ['caption', 'mono-label', SAMPLE.caption],
  ]
  return (
    <dl className="grid gap-10">
      {rows.map(([name, cls, sample]) => (
        <div key={name} className="grid gap-3 border-t border-line pt-4 md:grid-cols-12">
          <dt className="mono-label md:col-span-2">{name}</dt>
          <dd className={`${cls} md:col-span-10 [overflow-wrap:anywhere]`}>{sample}</dd>
        </div>
      ))}
    </dl>
  )
}

function Components() {
  return (
    <div className="grid gap-16">
      <div className="flex flex-wrap items-center gap-4">
        <CmsLink href="#tokens">{LABELS.primary}</CmsLink>
        <CmsLink href="#tokens" variant="secondary">
          {LABELS.secondary}
        </CmsLink>
        <MoreLink href="#tokens">{LABELS.more}</MoreLink>
        <a href="#type" className="link-draw font-medium">
          link-draw
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <Tag>{LABELS.tag}</Tag>
        <Tag tone="accent">{LABELS.tag}</Tag>
        <StatusMark status="planned" />
        <StatusMark status="in_progress" />
        <StatusMark status="completed" />
        <Eyebrow numbered={false} station={false}>
          {SAMPLE.caption}
        </Eyebrow>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <DimensionLine label={LABELS.dimension} />
        <DimensionLine />
      </div>
      <div className="grid gap-12 md:grid-cols-12">
        <ClipReveal className="md:col-span-7">
          <Frame caption={LABELS.frame}>
            <SmartImage media={SAMPLE_MEDIA} className="aspect-[16/10]" crop />
          </Frame>
        </ClipReveal>
        <div className="grid content-start gap-8 md:col-span-5">
          <Frame caption={LABELS.noMedia}>
            <SmartImage media={null} className="aspect-[4/3]" />
          </Frame>
          <Reveal>
            <p className="mono-label mb-2">{LABELS.count}</p>
            <p className="text-stat-lg font-heading">
              <CountUp value={30000} format={fmt} />
              <span className="mono-label ml-2 align-top">м²</span>
            </p>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

/** A detour that still enters and leaves at the margin: the contract every custom path keeps. */
const jog: TracePath = ({ x, w, h }) =>
  `M ${x} 0 V ${h * 0.35} H ${w * 0.5} V ${h * 0.55} H ${x} V ${h}`

/** Line contract bench: reorder sheets of mixed tones; the line must stay continuous. */
function TraceBench() {
  const base = useMemo(
    () =>
      [
        { id: 'a', tone: 'light' as Tone, path: undefined },
        { id: 'b', tone: 'dark' as Tone, path: jog },
        { id: 'c', tone: 'accent' as Tone, path: undefined },
        { id: 'd', tone: 'light' as Tone, path: jog },
      ] satisfies { id: string; tone: Tone; path: TracePath | undefined }[],
    [],
  )
  const [order, setOrder] = useState(base)
  const shuffle = () => setOrder((prev) => [...prev].sort(() => Math.random() - 0.5))
  return (
    <>
      <Section tone="light" anchor="trace" space="tight">
        <Eyebrow numbered={false}>{LABELS.trace}</Eyebrow>
        <button
          type="button"
          onClick={shuffle}
          className="mt-6 border border-fg px-5 py-3 font-medium"
        >
          {LABELS.shuffle}
        </button>
      </Section>
      {order.map((s, i) => (
        <Section key={s.id} tone={s.tone} trace={s.path} className="min-h-[60svh]">
          <Heading level={3}>
            {s.id.toUpperCase()} · {s.tone} · {i + 1}
          </Heading>
        </Section>
      ))}
    </>
  )
}

/** Pinned scene mechanics: N from the data, native scrolling, the active step follows position. */
function PinnedDemo() {
  const [count, setCount] = useState(5)
  const ref = useRef<HTMLElement>(null)
  const { pinned, active, progress } = usePinnedSteps(ref, count)
  const bar = useTransform(progress, [0, 1], [0, 1])
  return (
    <>
      <Section tone="dark" space="tight">
        <Eyebrow numbered={false}>{LABELS.pinned}</Eyebrow>
        <div className="mt-6 flex gap-2">
          {[1, 3, 5, 7].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n === count}
              onClick={() => setCount(n)}
              className="min-h-12 min-w-12 border border-fg px-3 aria-pressed:bg-fg aria-pressed:text-surface"
            >
              {n}
            </button>
          ))}
        </div>
      </Section>
      <section
        ref={ref}
        className="tone-dark relative"
        style={{ height: pinned ? pinnedHeight(count) : undefined }}
      >
        <div
          className={
            pinned
              ? 'sticky top-0 flex h-[100svh] flex-col justify-center pl-pad-l pr-pad-r'
              : 'pl-pad-l pr-pad-r'
          }
        >
          <ol className="grid gap-4">
            {Array.from({ length: count }, (_, i) => (
              <li
                key={i}
                className={
                  i === active || !pinned ? 'text-title font-heading text-fg' : 'mono-label'
                }
              >
                {LABELS.step} {String(i + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
              </li>
            ))}
          </ol>
          {pinned && (
            <motion.div className="mt-10 h-px origin-left bg-trace" style={{ scaleX: bar }} />
          )}
        </div>
      </section>
    </>
  )
}
