import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { landingOffset, LOCALES, scrollPath, scrollThrough, settled, sitePages } from './site'

/**
 * Quality of the public site: WCAG 2.2 A/AA by axe on every page in the three languages
 * (after scrolling through, so the lazy sections are in), and landing on an #anchor of another
 * page once its lazy sections have arrived.
 */

for (const locale of LOCALES) {
  for (const width of locale === 'ru' ? [1440, 375] : [1440]) {
    test(`axe: every page (${locale}, ${width})`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize({ width, height: width < 500 ? 812 : 900 })
      const found: string[] = []
      for (const path of [...sitePages(locale), `/${locale}/no-such-page`]) {
        await page.goto(path)
        await expect(page.locator('main h1').first()).toBeVisible()
        await scrollThrough(page)
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        for (const v of violations)
          for (const n of v.nodes) found.push(`${path} ${v.id}: ${n.target.join(' ')}`)
      }
      expect(found).toEqual([])
    })
  }
}

test.describe('anchor on another page', () => {
  test('opened by URL: one move to the target once the lazy sections are in', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/ru/development#contacts')
    await expect(page.locator('#contacts')).toBeAttached()
    const path = await scrollPath(page)
    expect(Math.abs((await landingOffset(page, 'contacts')) ?? 99)).toBeLessThanOrEqual(1)
    expect(path.filter((y) => y > 0)).toHaveLength(1)
  })

  test('through the router from another page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/ru')
    await settled(page)
    await page.evaluate(() => {
      window.history.pushState(window.history.state, '', '/ru/team#vacancies')
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
    })
    await expect(page.locator('#vacancies')).toBeAttached()
    await scrollPath(page)
    expect(Math.abs((await landingOffset(page, 'vacancies')) ?? 99)).toBeLessThanOrEqual(1)
  })

  test('the visitor scrolls first: the landing does not take the scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/ru/development#contacts')
    await expect(page.locator('header')).toBeVisible()
    await page.mouse.move(700, 450)
    await page.mouse.wheel(0, 300)
    await expect(page.locator('#contacts')).toBeAttached()
    await scrollPath(page)
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(2000)
  })
})
