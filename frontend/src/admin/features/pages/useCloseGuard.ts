import { useT } from '../../i18n'
import { useConfirm } from '../../ui/confirm-context'

/** Asks before closing the panel with unsaved edits. */
export function useCloseGuard(dirty: boolean, close: () => void) {
  const confirm = useConfirm()
  const t = useT()
  return async () => {
    if (
      !dirty ||
      (await confirm({
        title: t('form.unsaved.title'),
        description: t('form.unsaved.text'),
        confirmLabel: t('form.unsaved.leave'),
        danger: true,
      }))
    ) {
      close()
    }
  }
}
