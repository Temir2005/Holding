import type { Division } from '@/api/types'
import { CmsLink } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

type Props = {
  division: Division
  /** Draw the leader (scaleX): in the scene it is drawn when its stage opens. */
  drawn: boolean
  className?: string
  /** Anchor of the line's branch (list mode): the leader starts where the branch ends. */
  anchor?: string
}

/**
 * The division a stage is done by, as a callout on a drawing: a short leader with a tick and a
 * dot, then the name in mono. A link to the division page (or its site) when there is one.
 */
export function DivisionCallout({ division, drawn, className, anchor }: Props) {
  const href = division.page_slug ?? division.website_url
  const label = <span className="link-draw">{division.name}</span>
  const body = (
    <>
      <span
        aria-hidden="true"
        data-trace-anchor={anchor}
        className={cn(
          'relative h-0.5 w-6 flex-none origin-left bg-trace md:w-10',
          'before:absolute before:left-0 before:top-[-6px] before:h-3.5 before:w-px before:bg-trace',
          'after:absolute after:right-[-3px] after:top-[-3px] after:h-2 after:w-2 after:rounded-full after:bg-trace',
          'transition-transform delay-150 duration-3 ease-out motion-reduce:transition-none',
          drawn ? 'scale-x-100' : 'scale-x-0',
        )}
      />
      {label}
    </>
  )
  const cls = cn(
    'group inline-flex min-h-11 items-center gap-3 self-start font-mono text-caption font-medium uppercase text-accent-ink',
    className,
  )
  return href ? (
    <CmsLink href={href} plain className={cls}>
      {body}
    </CmsLink>
  ) : (
    <p className={cls}>{body}</p>
  )
}
