import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/cn'

/** CMS rich text. Raw HTML is not rendered (react-markdown default), so content is safe. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex max-w-prose flex-col gap-4 text-lead text-fg-mute',
        '[&_h2]:mt-4 [&_h2]:text-h3 [&_h2]:text-fg [&_h3]:text-fg [&_strong]:text-fg',
        '[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5',
        '[&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-4',
        className,
      )}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
