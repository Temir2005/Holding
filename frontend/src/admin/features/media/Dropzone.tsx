import { Upload } from 'lucide-react'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'

const hasFiles = (event: DragEvent) => [...event.dataTransfer.types].includes('Files')

/**
 * An area that takes dropped files (with an overlay while dragging) and an upload button
 * for the keyboard, touch screens and everyone who prefers a dialog.
 */
export function Dropzone({
  accept,
  onFiles,
  children,
  className,
  buttonLabel,
}: {
  accept: string
  onFiles: (files: File[]) => void
  children: ReactNode
  className?: string
  buttonLabel?: string
}) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  return (
    <div
      className={cn('relative', className)}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        depth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault()
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        depth.current = 0
        setDragging(false)
        onFiles([...e.dataTransfer.files])
      }}
    >
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="media-file-input"
        onChange={(e) => {
          if (e.target.files) onFiles([...e.target.files])
          e.target.value = ''
        }}
      />
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          variant="primary"
          icon={<Upload size={16} aria-hidden="true" />}
          onClick={() => input.current?.click()}
        >
          {buttonLabel ?? t('media.upload')}
        </Button>
        <span className="hidden text-xs text-mute md:inline">{t('media.dropHint')}</span>
      </div>
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-overlay flex items-center justify-center rounded-lg border-2 border-dashed border-accent-ink bg-panel/90">
          <p className="flex items-center gap-2 text-base font-medium">
            <Upload size={20} aria-hidden="true" />
            {t('media.dropHere')}
          </p>
        </div>
      )}
    </div>
  )
}
