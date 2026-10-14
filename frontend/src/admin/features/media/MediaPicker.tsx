import { useState } from 'react'
import type { MediaItem, MediaKind } from '../../api/media'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { MediaBrowser } from './MediaBrowser'

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accept?: readonly MediaKind[]
  many?: boolean
  /** Already chosen ids (many mode): they stay chosen and new ones are added after them. */
  initial?: readonly string[]
  onPick: (items: MediaItem[]) => void
}

/**
 * The media library in selection mode, with uploads: a new upload in single mode is picked
 * right away. Many mode collects a selection and confirms it.
 */
export function MediaPicker({
  open,
  onOpenChange,
  accept,
  many = false,
  initial = [],
  onPick,
}: MediaPickerProps) {
  const t = useT()
  const [chosen, setChosen] = useState<MediaItem[]>([])

  const close = () => {
    setChosen([])
    onOpenChange(false)
  }

  const activate = (item: MediaItem) => {
    if (!many) {
      onPick([item])
      close()
      return
    }
    // Files already in the field stay there; removing them is done in the field itself.
    if (initial.includes(item.id)) return
    setChosen((prev) =>
      prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item],
    )
  }

  const uploaded = (item: MediaItem) => {
    if (many) setChosen((prev) => [...prev, item])
    else activate(item)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={many ? t('media.picker.titleMany') : t('media.picker.title')}
      size="xl"
      footer={
        many ? (
          <>
            <Button onClick={close}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              disabled={chosen.length === 0}
              onClick={() => {
                onPick(chosen)
                close()
              }}
            >
              {t('media.picker.chooseMany', { count: chosen.length })}
            </Button>
          </>
        ) : undefined
      }
    >
      {open && (
        <MediaBrowser
          mode="pick"
          accept={accept}
          many={many}
          selectedIds={[...initial, ...chosen.map((i) => i.id)]}
          onActivate={activate}
          onUploaded={uploaded}
        />
      )}
    </Dialog>
  )
}
