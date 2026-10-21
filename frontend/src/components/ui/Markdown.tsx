import MarkdownToJsx, { type MarkdownToJSX } from 'markdown-to-jsx'
import { Fragment, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Level = 1 | 2 | 3 | 4 | 5 | 6

/**
 * The site's rich text in the drawing language: a ~65 character measure, the first paragraph
 * as the lead, a heading opens a sub-sheet with a hairline, list items carry the legend square,
 * links draw their underline. The look follows the level the editor wrote (`.md-h2` for # and
 * ##, `.md-h3` for ###), not the tag it renders as, so a demoted heading looks the same.
 */
const SHEET = [
  'flex max-w-[65ch] flex-col gap-5 text-body leading-relaxed text-fg-mute',
  '[&>p:first-child]:text-lead [&>p:first-child]:text-fg',
  '[&_.md-h2]:mt-6 [&_.md-h2]:border-t [&_.md-h2]:border-line [&_.md-h2]:pt-5 [&_.md-h2]:text-subtitle [&_.md-h2]:font-semibold [&_.md-h2]:text-fg',
  '[&>.md-h2:first-child]:mt-0 [&>.md-h2:first-child]:border-0 [&>.md-h2:first-child]:pt-0',
  '[&_.md-h3]:mt-3 [&_.md-h3]:text-lg [&_.md-h3]:font-semibold [&_.md-h3]:text-fg',
  '[&_.md-h4]:font-semibold [&_.md-h4]:text-fg',
  '[&_strong]:font-semibold [&_strong]:text-fg',
  '[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2',
  "[&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.68em] [&_ul>li]:before:h-1.5 [&_ul>li]:before:w-1.5 [&_ul>li]:before:bg-trace [&_ul>li]:before:content-['']",
  '[&_ol]:flex [&_ol]:list-[decimal-leading-zero] [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-8',
  '[&_ol>li]:pl-1 [&_ol>li]:marker:font-mono [&_ol>li]:marker:text-caption [&_ol>li]:marker:text-fg-mute',
  '[&_a]:link-draw [&_a]:font-medium [&_a]:text-fg',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-trace [&_blockquote]:pl-5 [&_blockquote]:text-lead [&_blockquote]:text-fg',
  '[&_hr]:border-line [&_code]:font-mono [&_code]:text-[0.9em]',
]

const LEVELS: Level[] = [1, 2, 3, 4, 5, 6]
const TAGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const
const LOOK: Record<Level, string> = {
  1: 'md-h2',
  2: 'md-h2',
  3: 'md-h3',
  4: 'md-h4',
  5: 'md-h4',
  6: 'md-h4',
}

/**
 * Headings of the text, never above `floor`: a text under a block title (h2) starts at h3, a
 * text inside a row titled with h3 starts at h4. Levels below the floor stay as written.
 * The generated ids are dropped: two texts with the same heading would repeat an id.
 */
function headings(floor: Level): MarkdownToJSX.Overrides {
  return Object.fromEntries(
    LEVELS.map((level) => {
      const Tag = TAGS[Math.max(level, floor) as Level]
      const Heading = ({ children }: { children?: ReactNode }) => (
        <Tag className={LOOK[level]}>{children}</Tag>
      )
      return [TAGS[level], Heading]
    }),
  )
}

const isExternal = (href: string | undefined) =>
  !!href && /^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)

/** Links of the text: outside the site in a new tab, without access to this window. */
function TextLink({ href, children, title }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return isExternal(href) ? (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <a href={href} title={title}>
      {children}
    </a>
  )
}

const cache = new Map<Level, MarkdownToJSX.Options>()

/** One options object per floor, so the compiler is not handed new options on every render. */
function optionsFor(floor: Level): MarkdownToJSX.Options {
  let options = cache.get(floor)
  if (!options) {
    options = {
      // raw HTML in CMS text is shown as text, never rendered
      disableParsingRawHTML: true,
      // one line of text is still a paragraph, like every other
      forceBlock: true,
      // the blocks are direct children of the sheet, so `>p:first-child` finds the lead
      wrapper: Fragment,
      overrides: { ...headings(floor), a: TextLink },
    }
    cache.set(floor, options)
  }
  return options
}

/**
 * CMS rich text (markdown-to-jsx). Raw HTML is not rendered; unsafe link and image URLs are
 * dropped by the library's sanitizer; external links get `rel="noopener noreferrer"`.
 * `headingFloor`: the lowest heading level the text may use under the surrounding headings
 * (`demoteHeadings` is the same as 3: the text sits under a section h2).
 */
export function Markdown({
  children,
  className,
  headingFloor,
  demoteHeadings = false,
}: {
  children: string
  className?: string
  headingFloor?: Level
  demoteHeadings?: boolean
}) {
  const floor = headingFloor ?? (demoteHeadings ? 3 : 1)
  return (
    <div className={cn(...SHEET, className)}>
      <MarkdownToJsx options={optionsFor(floor)}>{children}</MarkdownToJsx>
    </div>
  )
}
