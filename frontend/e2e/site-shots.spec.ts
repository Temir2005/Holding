import { expect, test, type Page } from '@playwright/test'

/**
 * Full-page screenshots of the public site for the redesign reports. Not an assertion suite:
 * run with `make e2e ARGS=e2e/site-shots.spec.ts`, files land in e2e/screenshots (not committed).
 */
const PAGES = [
  { name: 'home', path: '/ru' },
  { name: 'development', path: '/ru/development' },
  { name: 'smart-panels', path: '/ru/smart-panels' },
  { name: 'projects', path: '/ru/projects' },
  { name: 'team', path: '/ru/team' },
  { name: 'clients', path: '/ru/clients' },
  { name: 'project', path: '/ru/projects/zhk-proekt-a' },
  { name: '404', path: '/ru/no-such-page' },
  { name: 'home-kk', path: '/kk' },
  // Design system bench, dev builds only (the e2e stack runs the Vite dev server).
  { name: 'dev-design', path: '/ru/dev/design' },
] as const

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1920, height: 1080 },
] as const

/** Scrolls to the bottom so lazy images start loading, then waits for every image. */
async function settle(page: Page) {
  await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0)
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
    window.scrollTo(0, 0)
    await Promise.all(
      Array.from(document.images, (img) =>
        img.complete
          ? null
          : new Promise((resolve) => {
              img.addEventListener('load', resolve)
              img.addEventListener('error', resolve)
              // A lazy image far from the viewport may never start: do not wait forever.
              setTimeout(resolve, 5000)
            }),
      ),
    )
  })
  await page.waitForTimeout(600)
}

for (const size of WIDTHS) {
  test.describe(`public site at ${size.width}`, () => {
    test.use({ viewport: size })

    for (const target of PAGES) {
      test(target.name, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(target.path)
        await expect(page.locator('main')).toBeVisible()
        await settle(page)
        await page.screenshot({
          path: `e2e/screenshots/site-${target.name}-${size.width}.png`,
          fullPage: true,
        })
      })
    }
  })
}
