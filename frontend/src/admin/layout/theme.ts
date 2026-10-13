import { useEffect, useLayoutEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark']

const STORAGE_KEY = 'ms-admin-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Storage is a per-browser convenience: it may be blocked, so every access is guarded. */
function readChoice(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function saveChoice(choice: ThemeChoice) {
  try {
    if (choice === 'system') window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Not saved: the choice still applies until the page is reloaded.
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function useThemeChoice() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystemDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved: 'light' | 'dark' = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice
  const update = (next: ThemeChoice) => {
    setChoice(next)
    saveChoice(next)
  }
  return { choice, resolved, setChoice: update }
}

/**
 * Takes over <body> while the admin is mounted: the `.admin` class scopes admin tokens and
 * utilities (also for Radix portals, which render into <body>), `data-theme` picks the theme.
 * The admin is Russian-only, so <html lang> is `ru` meanwhile.
 * On unmount the site's body class, attributes and language come back exactly as they were.
 */
export function useAdminBody(theme: 'light' | 'dark') {
  useLayoutEffect(() => {
    const body = document.body
    const previousClass = body.className
    const previousTheme = body.getAttribute('data-theme')
    const previousLang = document.documentElement.lang
    body.className = 'admin'
    document.documentElement.lang = 'ru'
    return () => {
      body.className = previousClass
      document.documentElement.lang = previousLang
      if (previousTheme === null) body.removeAttribute('data-theme')
      else body.setAttribute('data-theme', previousTheme)
    }
  }, [])

  useLayoutEffect(() => {
    document.body.setAttribute('data-theme', theme)
  }, [theme])
}
