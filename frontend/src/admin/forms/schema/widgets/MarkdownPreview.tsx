import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/cn'

/**
 * Preview of the Markdown editor. Kept on react-markdown with its own look: the site renders
 * CMS text with markdown-to-jsx in the drawing style (components/ui/Markdown), and the admin
 * does not change with the site redesign. Raw HTML is not rendered (react-markdown default).
 */
export function MarkdownPreview({ children }: { children: string }) {
  return (
    <div
      className={cn(
        'flex max-w-prose flex-col gap-4 text-lead text-fg-mute',
        '[&_h2]:mt-4 [&_h2]:text-h3 [&_h2]:text-fg [&_h3]:text-fg [&_strong]:text-fg',
        '[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5',
        '[&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-4',
      )}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
