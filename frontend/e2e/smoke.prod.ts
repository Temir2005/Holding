import { expect, test } from '@playwright/test'
import {
  landingOffset,
  LOCALES,
  runScene,
  scrollPath,
  scrollThrough,
  settled,
  sitePages,
  traceRows,
  watchConsole,
} from './site'

/**
 * Smoke tests of the production build (make e2e-prod): what the dev server with StrictMode can
 * hide. The red line is measured and drawn by each section's own scroll, the «full cycle»
 * scene pins and steps both ways, the console stays clean, in the three languages.
 */

for (const locale of LOCALES) {
  test(`console is clean on every page (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const problems = watchConsole(page)
    for (const path of sitePages(locale)) {
      await page.goto(path)
      await settled(page)
      await scrollThrough(page)
      expect(problems, path).toEqual([])
    }
  })

  test(`the red line follows each section's scroll (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const path of [
      `/${locale}`,
      `/${locale}/development`,
      `/${locale}/projects/zhk-proekt-a`,
    ]) {
      await page.goto(path)
      await settled(page)
      await scrollThrough(page)
      // halfway down the page: sections above are drawn, one is being drawn, the rest wait
      const total = await page.evaluate(() => document.documentElement.scrollHeight)
      for (let y = 0; y < total / 2; y += 300) {
        await page.mouse.wheel(0, 300)
        await page.waitForTimeout(30)
      }
      await page.waitForTimeout(600)
      const rows = await traceRows(page)
      expect(rows.length, `${path}: segments`).toBeGreaterThan(3)
      for (const row of rows) {
        expect(row.drawn, `${path}: ${row.sheet} at ${row.top}px has a line`).not.toBeNull()
        expect(
          Math.abs((row.drawn ?? 0) - row.expected),
          `${path}: ${row.sheet} at ${row.top}px drawn ${row.drawn}, expected ${row.expected.toFixed(2)}`,
        ).toBeLessThan(0.05)
      }
    }
  })

  for (const size of [
    { width: 1440, height: 900 },
    { width: 375, height: 812 },
  ]) {
    test(`the full cycle scene steps both ways (${locale}, ${size.width})`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto(`/${locale}/development`)
      await settled(page)
      await scrollThrough(page)
      const { n, down, up, pinned } = await runScene(page)
      const stages = Array.from({ length: n }, (_, i) => i + 1)
      expect(n).toBeGreaterThan(1)
      expect(down).toEqual(stages)
      expect(up).toEqual([...stages].reverse())
      expect(pinned).toBe(true)
    })
  }
}

test('reduced motion: the scene is a plain list', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/ru/development')
  await settled(page)
  await expect(page.locator('[data-scene]')).toHaveCount(0)
})

test('an anchor on another page is reached once the lazy sections are in', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/ru/team#vacancies')
  // the target is in a lazy section mounted once the browser is idle
  await expect(page.locator('#vacancies')).toBeAttached()
  const path = await scrollPath(page)
  expect(Math.abs((await landingOffset(page, 'vacancies')) ?? 99)).toBeLessThanOrEqual(1)
  // one move from the top to the target, nothing in between
  expect(path.filter((y) => y > 0)).toHaveLength(1)
})
