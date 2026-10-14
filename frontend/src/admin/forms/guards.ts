import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { tAdmin } from '../i18n'
import { useConfirm } from '../ui/confirm-context'

/**
 * Warns before unsaved changes are lost: on navigation inside the admin (a dialog) and on
 * closing or reloading the tab (the browser's own prompt).
 */
export function useUnsavedGuard(dirty: boolean) {
  const confirm = useConfirm()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    void confirm({
      title: tAdmin('form.unsaved.title'),
      description: tAdmin('form.unsaved.text'),
      confirmLabel: tAdmin('form.unsaved.leave'),
      danger: true,
    }).then((leave) => (leave ? blocker.proceed() : blocker.reset()))
  }, [blocker, confirm])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Older browsers need returnValue set to show the prompt.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}

/** Cmd+S / Ctrl+S saves instead of opening the browser's "Save page" dialog. */
export function useSaveShortcut(onSave: () => void, enabled = true) {
  const latest = useRef(onSave)
  latest.current = onSave
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        latest.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
