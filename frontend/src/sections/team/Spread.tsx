import { useTranslation } from 'react-i18next'
import type { Person } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { DimArrow } from '@/components/ui/DimArrow'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Frame } from '@/components/ui/Frame'
import { Heading } from '@/components/ui/Heading'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'

type Props = {
  person: Person
  /** h2 when the block has no title of its own, h3 under the block title. */
  level: 2 | 3
  headingId?: string
  /** Mirror the spread: portrait on the right (second founder in a row). */
  flip?: boolean
  /** A single key person: the same spread, one size smaller. */
  compact?: boolean
}

const PAD = {
  left: 'md:pr-gap lg:pr-[calc(var(--gap)*2)]',
  right: 'md:pl-gap lg:pl-[calc(var(--gap)*2)]',
}

/**
 * Column of one page of the spread. The portrait of a compact spread is narrower on desktop
 * (four columns, inset from the gutter), its text page stays the full half.
 */
function pageClass(side: 'left' | 'right', compact: boolean | undefined, role: 'frame' | 'text') {
  const order = side === 'left' ? 'md:order-1 md:col-start-1' : 'md:order-2 md:col-start-7'
  const narrow = compact && role === 'frame'
  return cn(
    narrow ? 'col-span-10 md:col-span-6 lg:col-span-4' : 'col-span-12 md:col-span-6',
    order,
    narrow && side === 'left' && 'lg:col-start-2',
    narrow && side === 'right' && 'lg:col-start-8',
    PAD[side],
  )
}

/** Display size only while every word of the name fits half a sheet. */
const fitsDisplay = (name: string) =>
  name.length <= 28 && Math.max(...name.split(/\s+/).map((w) => w.length)) <= 12

/**
 * The founder as a monograph spread: two pages with a gutter between them. The left page is the
 * portrait 4:5 in a frame, the right one sets the name large at its head and the bio with the
 * LinkedIn link at its foot, both aligned with the edges of the portrait.
 */
export function Spread({ person, level, headingId, flip, compact }: Props) {
  const { t } = useTranslation()
  const bio = person.bio.trim()
  const big = !compact && fitsDisplay(person.full_name)

  return (
    <article className="relative grid grid-cols-12 gap-x-gap gap-y-10 md:gap-y-0">
      {/* the gutter of the spread */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 hidden w-px bg-line md:block"
      />
      <div className={pageClass(flip ? 'right' : 'left', compact, 'frame')}>
        <Frame>
          <ClipReveal from={flip ? 'bottom' : 'left'}>
            <SmartImage
              media={person.photo}
              crop
              className="aspect-[4/5]"
              sizes="(min-width: 768px) 45vw, 100vw"
            />
          </ClipReveal>
        </Frame>
      </div>

      <Reveal
        delay={0.15}
        className={cn('flex flex-col', pageClass(flip ? 'left' : 'right', compact, 'text'))}
      >
        <div className="flex flex-col gap-6 md:gap-8">
          {person.position && (
            <p className="mono-label border-b border-line pb-4 text-fg [overflow-wrap:break-word]">
              {person.position}
              {person.division && <span className="text-fg-mute"> · {person.division.name}</span>}
            </p>
          )}
          <Heading
            level={level}
            id={headingId}
            size={big ? 'display' : 'h2'}
            className={big ? 'max-w-[9ch]' : 'max-w-[16ch]'}
          >
            {person.full_name}
          </Heading>
        </div>

        <div className="mt-10 flex flex-col gap-8 md:mt-auto md:pt-12">
          <DimensionLine className="text-fg-mute" />
          {bio && <p className="max-w-[40ch] text-lead [overflow-wrap:break-word]">{bio}</p>}
          {person.linkedin_url && (
            <a
              href={person.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/more inline-flex w-fit items-center gap-4 py-2 font-medium text-fg"
            >
              <span className="link-draw">{t('team.linkedin')}</span>
              <DimArrow />
            </a>
          )}
        </div>
      </Reveal>
    </article>
  )
}
