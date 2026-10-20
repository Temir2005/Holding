import { useId, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'

const focusVisible = (el: Element) => {
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}

/**
 * A disclosure that can also peek: with `peek` it opens while a mouse hovers the item or the
 * keyboard focuses its button, and stays open after a click or Enter (pinned). A press on an
 * open disclosure or Esc closes it. Touch has no hover: a tap pins it.
 */
export function useDisclosure({ peek: canPeek = false }: { peek?: boolean } = {}) {
  const id = useId()
  const [peek, setPeek] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = peek || pinned
  const close = () => {
    setPeek(false)
    setPinned(false)
  }

  return {
    open,
    panelId: id,
    /** Spread on the whole item: mouse hover peeks. */
    hoverProps: canPeek
      ? {
          onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && setPeek(true),
          onPointerLeave: (e: PointerEvent) => e.pointerType === 'mouse' && setPeek(false),
        }
      : {},
    /** Spread on the toggle button. */
    buttonProps: {
      type: 'button' as const,
      'aria-expanded': open,
      'aria-controls': id,
      onClick: () => (open ? close() : setPinned(true)),
      onFocus: (e: FocusEvent<HTMLElement>) =>
        canPeek && focusVisible(e.currentTarget) && setPeek(true),
      onBlur: () => setPeek(false),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          close()
        }
      },
    },
  }
}
