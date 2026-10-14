import * as Tabs from '@radix-ui/react-tabs'
import { Bold, Heading2, Italic, Link2, List, ListOrdered, type LucideIcon } from 'lucide-react'
import { useRef, useState, type Ref } from 'react'
import { Markdown } from '@/components/ui/Markdown'
import { cn } from '@/lib/cn'
import { useT } from '../../../i18n'
import { controlClass } from '../../../ui/styles'
import { applyMarkdown, type MarkdownAction } from '../../markdown'

const ACTIONS: { action: MarkdownAction; icon: LucideIcon; label: string }[] = [
  { action: 'bold', icon: Bold, label: 'form.markdown.bold' },
  { action: 'italic', icon: Italic, label: 'form.markdown.italic' },
  { action: 'heading', icon: Heading2, label: 'form.markdown.heading' },
  { action: 'list', icon: List, label: 'form.markdown.list' },
  { action: 'ordered', icon: ListOrdered, label: 'form.markdown.ordered' },
  { action: 'link', icon: Link2, label: 'form.markdown.link' },
]

const tabClass =
  'min-h-touch px-3 text-sm text-mute data-[state=active]:font-medium data-[state=active]:text-fg md:min-h-8 border-b-2 border-transparent data-[state=active]:border-accent'

interface MarkdownEditorProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  inputRef?: Ref<HTMLTextAreaElement>
  lang?: string
  placeholder?: string
  describedBy?: string
  invalid?: boolean
}

/**
 * Markdown with a formatting toolbar and a preview rendered by the same `Markdown`
 * component as the site, so the editor sees what visitors will see.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  inputRef,
  lang,
  placeholder,
  describedBy,
  invalid,
}: MarkdownEditorProps) {
  const t = useT()
  const textarea = useRef<HTMLTextAreaElement | null>(null)
  const [tab, setTab] = useState('write')

  const apply = (action: MarkdownAction) => {
    const el = textarea.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const edit = applyMarkdown(action, value, start, end, t('form.markdown.linkText'))
    onChange(edit.text)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(edit.selectionStart, edit.selectionEnd)
    })
  }

  const setRefs = (el: HTMLTextAreaElement | null) => {
    textarea.current = el
    if (typeof inputRef === 'function') inputRef(el)
    else if (inputRef) (inputRef as { current: HTMLTextAreaElement | null }).current = el
  }

  return (
    <Tabs.Root
      value={tab}
      onValueChange={setTab}
      className="flex flex-col rounded border border-line-strong"
    >
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-line px-1">
        <Tabs.List aria-label={t('form.markdown.toolbar')} className="flex">
          <Tabs.Trigger value="write" className={tabClass}>
            {t('form.markdown.write')}
          </Tabs.Trigger>
          <Tabs.Trigger value="preview" className={tabClass}>
            {t('form.markdown.preview')}
          </Tabs.Trigger>
        </Tabs.List>
        {tab === 'write' && (
          <div
            role="toolbar"
            aria-label={t('form.markdown.toolbar')}
            aria-controls={id}
            className="flex"
          >
            {ACTIONS.map(({ action, icon: Icon, label }) => (
              <button
                key={action}
                type="button"
                aria-label={t(label)}
                title={t(label)}
                onClick={() => apply(action)}
                className="inline-flex min-h-touch min-w-touch items-center justify-center rounded text-mute hover:bg-sunken hover:text-fg md:min-h-8 md:min-w-8"
              >
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
      <Tabs.Content value="write" forceMount hidden={tab !== 'write'}>
        <textarea
          id={id}
          ref={setRefs}
          lang={lang}
          rows={10}
          value={value}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(
            controlClass,
            'rounded-none border-0 py-2 font-mono text-sm leading-relaxed',
          )}
        />
      </Tabs.Content>
      <Tabs.Content value="preview" className="p-3">
        {value.trim() ? (
          <div className="tone-light rounded p-4" lang={lang}>
            <Markdown>{value}</Markdown>
          </div>
        ) : (
          <p className="text-sm text-mute">{t('form.markdown.empty')}</p>
        )}
      </Tabs.Content>
    </Tabs.Root>
  )
}
