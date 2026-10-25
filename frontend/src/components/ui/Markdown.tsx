import MarkdownToJsx, { type MarkdownToJSX } from 'markdown-to-jsx'
import { Fragment, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Level = 1 | 2 | 3 | 4 | 5 | 6

/** The site's rich text: paragraphs, headings and lists styled by `.prose` (globals.css). */
const SHEET = ['prose']

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
