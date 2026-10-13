import * as RadixToast from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { AdminApiError, ErrorCode } from '../api/errors'
import { useT } from '../i18n'
import { ToastContext, type ToastApi, type ToastItem, type ToastTone } from './toast-context'

const TONE: Record<ToastTone, string> = {
  success: 'border-l-success',
  danger: 'border-l-danger',
  info: 'border-l-info',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((toast: Omit<ToastItem, 'id'>) => {
    setItems((prev) => [...prev.slice(-3), { ...toast, id: nextId++ }])
  }, [])

  const api: ToastApi = {
    show,
    success: (title, description) => show({ tone: 'success', title, description }),
    error: (error, fallbackTitle) => {
      let title: ReactNode = fallbackTitle ?? t('errors.unknown')
      if (error instanceof AdminApiError) {
        title = error.code === ErrorCode.network ? t('errors.network') : error.message
      }
      show({ tone: 'danger', title })
    },
  }

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="right" duration={5000} label={t('common.dismiss')}>
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            type={item.tone === 'danger' ? 'foreground' : 'background'}
            duration={item.tone === 'danger' ? 8000 : 5000}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((i) => i.id !== item.id))
            }}
            className={cn(
              'flex items-start gap-3 rounded border border-l-4 border-line bg-panel p-3 text-fg shadow-lg',
              TONE[item.tone],
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <RadixToast.Title className="text-sm font-medium">{item.title}</RadixToast.Title>
              {item.description && (
                <RadixToast.Description className="text-sm text-mute">
                  {item.description}
                </RadixToast.Description>
              )}
            </div>
            <RadixToast.Close
              aria-label={t('common.dismiss')}
              className="-m-1 inline-flex min-h-touch min-w-touch items-center justify-center rounded text-mute hover:text-fg md:min-h-8 md:min-w-8"
            >
              <X size={16} aria-hidden="true" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-[calc(theme(spacing.bottombar)+0.5rem)] left-2 right-2 z-toast flex flex-col gap-2 outline-none md:bottom-4 md:left-auto md:right-4 md:w-96" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
