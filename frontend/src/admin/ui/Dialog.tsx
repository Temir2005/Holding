import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useT } from '../i18n'

const overlayClass = 'fixed inset-0 z-overlay bg-black/40'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  /** `alertdialog` semantics: no close on outside click (destructive confirmations). */
  modalOnly?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const WIDTH = { sm: 'md:max-w-sm', md: 'md:max-w-lg', lg: 'md:max-w-3xl', xl: 'md:max-w-5xl' }

/** Centered dialog on tablet and up, a bottom sheet on phones. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  modalOnly = false,
  size = 'md',
}: DialogProps) {
  const t = useT()
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClass} />
        <RadixDialog.Content
          role={modalOnly ? 'alertdialog' : 'dialog'}
          onPointerDownOutside={modalOnly ? (e) => e.preventDefault() : undefined}
          className={cn(
            'fixed z-modal flex max-h-[90dvh] flex-col bg-panel text-fg shadow-xl',
            'inset-x-0 bottom-0 rounded-t-lg pb-[env(safe-area-inset-bottom)]',
            'md:inset-auto md:left-1/2 md:top-1/2 md:w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:pb-0',
            WIDTH[size],
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-sm text-mute">
                  {description}
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label={t('common.close')}
              className="-m-2 inline-flex min-h-touch min-w-touch items-center justify-center rounded text-mute hover:bg-sunken hover:text-fg md:min-h-9 md:min-w-9"
            >
              <X size={18} aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 md:flex-row md:justify-end">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  side?: 'left' | 'right' | 'bottom'
  /** Right panels: `wide` for editors with long forms. */
  size?: 'md' | 'wide'
  children: ReactNode
  className?: string
}

/** Side or bottom drawer: the phone "more" menu, and later the block editor panel. */
export function Sheet({
  open,
  onOpenChange,
  title,
  side = 'right',
  size = 'md',
  children,
  className,
}: SheetProps) {
  const t = useT()
  const position = {
    left: 'inset-y-0 left-0 w-[min(20rem,85vw)] border-r',
    right: cn(
      'inset-y-0 right-0 border-l',
      size === 'wide' ? 'w-[min(44rem,100vw)]' : 'w-[min(32rem,100vw)]',
    ),
    bottom:
      'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg border-t pb-[env(safe-area-inset-bottom)]',
  }[side]
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClass} />
        <RadixDialog.Content
          className={cn(
            'fixed z-modal flex flex-col border-line bg-panel text-fg shadow-xl',
            position,
            className,
          )}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-2">
            <RadixDialog.Title className="flex-1 text-base font-semibold">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
            <RadixDialog.Close
              aria-label={t('common.close')}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded text-mute hover:bg-sunken hover:text-fg"
            >
              <X size={18} aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
