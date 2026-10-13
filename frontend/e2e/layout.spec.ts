import { expect, test } from '@playwright/test'
import { ensureEditor, signIn, VIEWPORTS } from './helpers'

/** Screenshots land in e2e/screenshots (not committed) for the stage report. */
const shot = (name: string) => ({ path: `e2e/screenshots/${name}.png`, fullPage: true })

for (const viewport of VIEWPORTS) {
  test.describe(`layout at ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('login page', async ({ page }) => {
      await page.goto('/admin/login')
      await expect(page.getByRole('heading', { name: 'Вход в админку' })).toBeVisible()
      await page.screenshot(shot(`login-${viewport.name}-${viewport.width}`))
    })

    test('navigation fits the screen', async ({ page }) => {
      await signIn(page)
      const nav = page.getByRole('navigation', { name: 'Разделы' })

      if (viewport.width < 768) {
        // Phone: bottom bar, the rest under "More".
        await expect(nav.getByRole('link', { name: 'Заявки' })).toBeVisible()
        await page.getByRole('button', { name: 'Ещё' }).click()
        await expect(page.getByRole('dialog', { name: 'Все разделы' })).toBeVisible()
        await page.screenshot(shot(`more-${viewport.name}-${viewport.width}`))
        await page.keyboard.press('Escape')
      } else if (viewport.width < 1280) {
        // Tablet: icon rail, labels as accessible names.
        await expect(nav.getByRole('link', { name: 'Страницы' })).toBeVisible()
        await expect(nav.getByText('Страницы', { exact: true })).toHaveCount(0)
      } else {
        await expect(nav.getByText('Страницы', { exact: true })).toBeVisible()
      }

      // Every navigation target is at least 44px tall on phones.
      if (viewport.width < 768) {
        for (const link of await nav.getByRole('link').all()) {
          const box = await link.boundingBox()
          expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
        }
      }

      // No horizontal page scroll at any width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)

      await page.screenshot(shot(`dashboard-${viewport.name}-${viewport.width}`))
    })
  })
}

test('dark theme', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await signIn(page)
  await page.getByRole('button', { name: 'Тема оформления' }).click()
  await page.getByRole('menuitemradio', { name: 'Тёмная' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot(shot('dashboard-dark-1280'))
})

test('menu depends on the role', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await signIn(page)
  const nav = page.getByRole('navigation', { name: 'Разделы' })
  await expect(nav.getByRole('link', { name: 'Пользователи' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Журнал действий' })).toBeVisible()

  const editorUser = await ensureEditor(request)
  await page.getByRole('button', { name: 'Меню профиля' }).click()
  await page.getByRole('menuitem', { name: 'Выйти' }).click()
  await signIn(page, '/admin', editorUser)
  await expect(nav.getByRole('link', { name: 'Страницы' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Пользователи' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Настройки сайта' })).toHaveCount(0)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Нет доступа' })).toBeVisible()
})
