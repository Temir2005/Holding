import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/cn'

/**
 * - `sheet`: the site's rich text in the drawing language — a ~65 character measure, the first
 *   paragraph as the lead, a heading opens a sub-sheet with a hairline, list items carry the
 *   legend square, links draw their underline.
 * - `plain` (default): the previous look, kept as is because the admin's Markdown editor renders
 *   its preview with this component and the admin must not change with the site redesign.
 */
const VARIANTS = {
  plain: [
    'flex max-w-prose flex-col gap-4 text-lead text-fg-mute',
    '[&_h2]:mt-4 [&_h2]:text-h3 [&_h2]:text-fg [&_h3]:text-fg [&_strong]:text-fg',
    '[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5',
    '[&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-4',
  ],
  sheet: [
    'flex max-w-[65ch] flex-col gap-5 text-body leading-relaxed text-fg-mute',
    '[&>p:first-child]:text-lead [&>p:first-child]:text-fg',
    '[&_h2]:mt-6 [&_h2]:border-t [&_h2]:border-line [&_h2]:pt-5 [&_h2]:text-subtitle [&_h2]:font-semibold [&_h2]:text-fg',
    '[&>h2:first-child]:mt-0 [&>h2:first-child]:border-0 [&>h2:first-child]:pt-0',
    '[&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-fg',
    '[&_strong]:font-semibold [&_strong]:text-fg',
    '[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2',
    "[&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.68em] [&_ul>li]:before:h-1.5 [&_ul>li]:before:w-1.5 [&_ul>li]:before:bg-trace [&_ul>li]:before:content-['']",
    '[&_ol]:flex [&_ol]:list-[decimal-leading-zero] [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-8',
    '[&_ol>li]:pl-1 [&_ol>li]:marker:font-mono [&_ol>li]:marker:text-caption [&_ol>li]:marker:text-fg-mute',
    '[&_a]:link-draw [&_a]:font-medium [&_a]:text-fg',
    '[&_blockquote]:border-l-2 [&_blockquote]:border-trace [&_blockquote]:pl-5 [&_blockquote]:text-lead [&_blockquote]:text-fg',
    '[&_hr]:border-line [&_code]:font-mono [&_code]:text-[0.9em]',
  ],
} as const

/** CMS rich text. Raw HTML is not rendered (react-markdown default), so content is safe. */
export function Markdown({
  children,
  className,
  variant = 'plain',
}: {
  children: string
  className?: string
  variant?: keyof typeof VARIANTS
}) {
  return (
    <div className={cn(...VARIANTS[variant], className)}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
