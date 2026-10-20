import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Eyebrow } from './Eyebrow'
import { Heading } from './Heading'
import { Reveal } from './Reveal'

type Props = {
  id?: string
  eyebrow?: string | null
  title?: string | null
  intro?: string | null
  aside?: ReactNode
  className?: string
}

/**
 * Header of a sheet: meta row (number + eyebrow) over a hairline, the title on 8 columns,
 * an aside (link, dimension, filter) on the last three.
 */
export function SectionHeader({ id, eyebrow, title, intro, aside, className }: Props) {
  if (!eyebrow && !title && !intro && !aside) return null
  return (
    <Reveal
      className={cn('mb-12 grid grid-cols-12 items-end gap-x-gap gap-y-6 md:mb-24', className)}
    >
      <div className="col-span-12 border-b border-line pb-4">
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      {title && (
        <Heading level={2} id={id} className="col-span-12 lg:col-span-8">
          {title}
        </Heading>
      )}
      {aside && (
        <div className="col-span-12 lg:col-span-3 lg:col-start-10 lg:justify-self-start">
          {aside}
        </div>
      )}
      {intro && (
        <p className="col-span-12 max-w-[36ch] text-lead text-fg-mute lg:col-span-6">{intro}</p>
      )}
    </Reveal>
  )
}
