import { expect, type Page } from '@playwright/test'

/** Public site helpers shared by the dev suite and the production smoke tests. */

export const LOCALES = ['ru', 'kk', 'en'] as const

/** Paths of the site pages (the navigation of the seeds) and a project, per locale. */
export const sitePages = (locale: string) =>
  [
    '',
    '/development',
    '/smart-panels',
    '/projects',
    '/team',
    '/clients',
    '/projects/zhk-proekt-a',
  ].map((p) => `/${locale}${p}`)

/** Collects console errors and warnings and uncaught errors of a page. */
export function watchConsole(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  return problems
}

/** The page is rendered: no skeleton, the main heading is there. */
export async function settled(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await expect(page.locator('main h1').first()).toBeVisible()
}

/** Scrolls through the page with the wheel (lazy sections, reveals, images), back to the top. */
export async function scrollThrough(page: Page, step = 500) {
  const { width, height } = page.viewportSize() ?? { width: 1280, height: 800 }
  await page.mouse.move(width / 2, height / 2)
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < total; y += step) {
    await page.mouse.wheel(0, step)
    await page.waitForTimeout(30)
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

/**
 * Each section's red line against its own scroll: the drawn share of the main path and the
 * expected one from where the section is, the pen at 78% of the viewport.
 */
export function traceRows(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-trace-probe]')].map((probe) => {
      const sheet = probe.parentElement as HTMLElement
      const r = sheet.getBoundingClientRect()
      const expected = Math.min(1, Math.max(0, (0.78 * innerHeight - r.top) / r.height))
      const path = sheet.querySelector(':scope > svg[data-trace] path')
      const dash = path?.getAttribute('stroke-dasharray') ?? (path ? '1' : null)
      const drawn = dash === null ? null : parseFloat(dash)
      return { sheet: sheet.tagName.toLowerCase(), top: Math.round(r.top), expected, drawn }
    }),
  )
}

/**
 * Runs through the pinned «full cycle» scene with the wheel, down and back up. Returns the
 * sequence of open stages (1-based) each way and whether the stage stayed pinned.
 */
export async function runScene(page: Page) {
  const { width, height } = page.viewportSize() ?? { width: 1280, height: 800 }
  const scene = page.locator('[data-scene]')
  await expect(scene).toHaveCount(1)
  const info = await scene.evaluate((s) => ({
    top: s.getBoundingClientRect().top + scrollY,
    height: (s as HTMLElement).offsetHeight,
    n: s.querySelectorAll('ol[role=list] > li').length,
  }))
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), info.top - height)
  await page.mouse.move(width / 2, height / 2)
  let pinned = true
  const sample = () =>
    page.evaluate(() => {
      const stage = document.querySelector('[data-scene-stage]')?.getBoundingClientRect()
      const s = document.querySelector('[data-scene]')?.getBoundingClientRect()
      const panels = [...document.querySelectorAll('[data-scene] ol[role=list] > li')]
      return {
        open: panels.findIndex((p) => p.hasAttribute('data-open')) + 1,
        stageTop: Math.round(stage?.top ?? 0),
        inScene: !!s && s.top <= 0 && s.bottom >= innerHeight,
      }
    })
  const walk = async (dy: number) => {
    const seen: number[] = []
    for (let y = 0; y < info.height + height; y += 120) {
      await page.mouse.wheel(0, dy)
      await page.waitForTimeout(90)
      const r = await sample()
      if (r.inScene && Math.abs(r.stageTop) > 1) pinned = false
      if (seen[seen.length - 1] !== r.open) seen.push(r.open)
    }
    return seen
  }
  const down = await walk(120)
  const up = await walk(-120)
  return { n: info.n, down, up, pinned }
}

/** Where #id ends up relative to its scroll-margin (0 = landed exactly under the header). */
export const landingOffset = (page: Page, id: string) =>
  page.evaluate((id) => {
    const el = document.getElementById(id)
    if (!el) return null
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    return Math.round(el.getBoundingClientRect().top - margin)
  }, id)

/** Polls scrollY until it has not changed for `quietMs`; returns the distinct values seen. */
export async function scrollPath(page: Page, quietMs = 1200) {
  const seen: number[] = []
  let still = 0
  for (let i = 0; i < 200 && still * 40 < quietMs; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY))
    if (seen[seen.length - 1] !== y) {
      seen.push(y)
      still = 0
    } else still++
    await page.waitForTimeout(40)
  }
  return seen
}
