import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAdminBody } from './theme'

describe('useAdminBody', () => {
  afterEach(() => {
    document.body.className = ''
    document.body.removeAttribute('data-theme')
  })

  it('swaps the site body class for the admin one and restores it on unmount', () => {
    document.body.className = 'tone-dark'
    document.documentElement.lang = 'kk'

    const { rerender, unmount } = renderHook(({ theme }) => useAdminBody(theme), {
      initialProps: { theme: 'light' as 'light' | 'dark' },
    })
    expect(document.body.className).toBe('admin')
    expect(document.body.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.lang).toBe('ru')

    rerender({ theme: 'dark' })
    expect(document.body.getAttribute('data-theme')).toBe('dark')

    unmount()
    expect(document.body.className).toBe('tone-dark')
    expect(document.body.hasAttribute('data-theme')).toBe(false)
    expect(document.documentElement.lang).toBe('kk')
  })
})
