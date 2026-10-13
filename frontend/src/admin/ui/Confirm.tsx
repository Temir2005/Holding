import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { Button } from './Button'
import { ConfirmContext, type Confirm, type ConfirmOptions } from './confirm-context'
import { Dialog } from './Dialog'

/** `const confirm = useConfirm(); if (await confirm({...})) …` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<Confirm>((next) => {
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={options !== null}
        onOpenChange={(open) => !open && settle(false)}
        title={options?.title}
        description={options?.description}
        modalOnly={options?.danger}
        size="sm"
        footer={
          <>
            <Button onClick={() => settle(false)}>{t('common.cancel')}</Button>
            <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {options?.confirmLabel ?? t('common.confirm')}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  )
}
