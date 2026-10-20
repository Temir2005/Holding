import type { Client, Tone } from '@/api/types'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'

/** Monochrome version of a logo per tone: grey on paper, chalk on graphite, carbon on red. */
const MONO: Record<Tone, string> = {
  light: 'grayscale opacity-60',
  dark: '[filter:brightness(0)_invert(1)] opacity-60',
  accent: '[filter:brightness(0)] opacity-70',
}

type Props = {
  client: Client
  tone: Tone
  /** Size of the image box (height, max width). */
  className?: string
  /**
   * Cross-fade to the logo's own colours when the surrounding `group` is hovered, focused or
   * open (`data-open`). Static logos stay monochrome.
   */
  live?: boolean
}

/**
 * A client's logo in the language of the logo wall (`clients_marquee`): monochrome on the
 * sheet, its own colours on a lit cell. Opacity only, two stacked copies. Decorative: the
 * client's name is always in the text next to it.
 */
export function LogoMark({ client, tone, className = 'h-8 w-auto max-w-full', live }: Props) {
  if (!client.logo) return null
  const mono = (
    <SmartImage media={client.logo} fit="contain" className={cn(className, MONO[tone])} />
  )
  if (!live) return <span aria-hidden="true">{mono}</span>
  return (
    <span aria-hidden="true" className="relative inline-grid max-w-full">
      <span className="transition-opacity duration-2 [grid-area:1/1] group-hover:opacity-0 group-focus-visible:opacity-0 group-data-[open=true]:opacity-0">
        {mono}
      </span>
      <span className="opacity-0 transition-opacity duration-2 [grid-area:1/1] group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[open=true]:opacity-100">
        <SmartImage media={client.logo} fit="contain" className={className} />
      </span>
    </span>
  )
}
