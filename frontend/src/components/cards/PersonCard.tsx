import { useTranslation } from 'react-i18next'
import type { Person } from '@/api/types'
import { ClipReveal } from '@/components/motion/ClipReveal'
import { Frame } from '@/components/ui/Frame'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { pad2 } from '@/sections/sectionNumber'
import { useDisclosure } from '@/components/ui/useDisclosure'

type Props = {
  person: Person
  /** Figure number under the portrait, from 0. */
  index: number
  /** Aspect classes of the portrait frame (the editorial grid varies them). */
  frameClassName?: string
  sizes?: string
  delay?: number
}

/**
 * A portrait of the editorial grid: framed photo with crop marks, figure number, name, position
 * in mono, division. The bio slides over the portrait on a solid sheet (never text on a photo)
 * while a mouse hovers the person or the keyboard focuses the bio button; a click or a tap pins it.
 */
export function PersonCard({ person, index, frameClassName, sizes, delay = 0 }: Props) {
  const { t } = useTranslation()
  const bio = person.bio.trim()
  const { open, panelId, hoverProps, buttonProps } = useDisclosure({ peek: true })

  return (
    <div className="flex flex-col" {...(bio ? hoverProps : {})}>
      <Frame>
        <ClipReveal delay={delay}>
          <SmartImage
            media={person.photo}
            crop
            className={frameClassName ?? 'aspect-[4/5]'}
            sizes={sizes ?? '(min-width: 1024px) 30vw, 50vw'}
          />
        </ClipReveal>
        {bio && (
          <div
            id={panelId}
            className={cn(
              'absolute inset-0 flex flex-col justify-end overflow-hidden',
              open ? 'visible' : 'invisible [transition:visibility_0s_linear_300ms]',
            )}
          >
            <div
              className={cn(
                'relative max-h-full overflow-y-auto border-t border-line-strong bg-surface p-4 sm:p-5',
                'motion-reduce:[clip-path:none]',
                open
                  ? 'opacity-100 [clip-path:inset(0)] [transition:clip-path_450ms_cubic-bezier(.2,.7,.2,1),opacity_150ms_linear]'
                  : 'opacity-0 [clip-path:inset(100%_0_0_0)] [transition:clip-path_300ms_cubic-bezier(.2,.7,.2,1),opacity_300ms_linear]',
              )}
            >
              {/* the pen draws the edge of the sheet as it comes up */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 top-0 h-px origin-left bg-trace transition-transform delay-150 duration-4 ease-out motion-reduce:transition-none',
                  open ? 'scale-x-100' : 'scale-x-0',
                )}
              />
              <p className="mono-label mb-3">{t('team.bio')}</p>
              <p className="text-[0.9375rem] leading-normal text-fg [overflow-wrap:break-word]">
                {bio}
              </p>
            </div>
          </div>
        )}
      </Frame>

      <div className="mt-6 grid gap-x-3 gap-y-2 border-t border-line pt-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
        <span
          aria-hidden="true"
          className="tabular font-mono text-caption font-medium text-accent-ink"
        >
          {pad2(index + 1)}
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className="text-subtitle font-semibold [overflow-wrap:break-word]">
            {person.full_name}
          </h3>
          {person.position && (
            <p className="mono-label mt-2 text-fg [overflow-wrap:break-word]">{person.position}</p>
          )}
          {person.division && (
            <p className="mono-label mt-1 [overflow-wrap:break-word]">{person.division.name}</p>
          )}
          {bio && (
            <button
              {...buttonProps}
              aria-label={t('team.bioOf', { name: person.full_name })}
              className="mt-3 inline-flex min-h-11 w-fit items-center gap-3 font-mono text-caption font-medium uppercase text-fg"
            >
              <PlusMark open={open} />
              <span className="link-draw">{t('team.bio')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Plus that turns into a minus: the vertical bar folds away (transform only). */
export function PlusMark({ open, className }: { open: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative block h-2.5 w-2.5 flex-none', className)}>
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
      <span
        className={cn(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-2 ease-out',
          open ? 'scale-y-0' : 'scale-y-100',
        )}
      />
    </span>
  )
}
