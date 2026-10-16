import { expect, test, type Page } from '@playwright/test'
import { signIn, VIEWPORTS } from './helpers'

const shot = (name: string) => ({ path: `e2e/screenshots/${name}.png`, fullPage: true })

/** Every section of the admin, by a short name for the screenshots. */
const SECTIONS: { name: string; path: string; heading: RegExp | string }[] = [
  { name: 'dashboard', path: '/admin', heading: 'Главная' },
  { name: 'pages', path: '/admin/pages', heading: 'Страницы' },
  { name: 'page-editor', path: 'home-editor', heading: /.+/ },
  { name: 'media', path: '/admin/media', heading: 'Медиатека' },
  { name: 'projects', path: '/admin/collections/projects', heading: 'Проекты' },
  { name: 'project-new', path: '/admin/collections/projects/new', heading: 'Новый проект' },
  { name: 'stats', path: '/admin/collections/stats', heading: 'Цифры' },
  { name: 'leads', path: '/admin/leads', heading: 'Заявки' },
  { name: 'settings', path: '/admin/settings', heading: 'Настройки сайта' },
  { name: 'users', path: '/admin/users', heading: 'Пользователи' },
  { name: 'audit', path: '/admin/audit', heading: 'Журнал действий' },
]

/** Buttons, links and fields with no accessible name, from the accessibility tree. */
async function unnamedControls(page: Page): Promise<string[]> {
  const tree = await page.locator('body').ariaSnapshot()
  const control =
    /^\s*- (button|link|textbox|searchbox|combobox|checkbox|radio|switch|tab|spinbutton|slider)(\s*\[[^\]]*\])?:?$/
  return tree.split('\n').filter((line) => control.test(line))
}

async function open(page: Page, path: string) {
  if (path === 'home-editor') {
    await page.goto('/admin/pages')
    await page.getByRole('link', { name: /\/home/ }).click()
    await expect(page.getByRole('tab', { name: 'Блоки' })).toBeVisible()
  } else {
    await page.goto(path)
  }
}

for (const viewport of VIEWPORTS) {
  test(`every section at ${viewport.width}px: fits, names its controls`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await signIn(page)
    for (const section of SECTIONS) {
      await open(page, section.path)
      await expect(page.getByRole('heading', { level: 1, name: section.heading })).toBeVisible()
      // Lists and forms have loaded: no skeletons left.
      await expect(page.locator('.animate-pulse')).toHaveCount(0)
      expect(await page.title(), section.name).toContain('MegaSmart')

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${section.name}: horizontal scroll`).toBeLessThanOrEqual(0)
      expect(await unnamedControls(page), `${section.name}: controls without a name`).toEqual([])
      await page.screenshot(shot(`${section.name}-${viewport.width}`))
    }
  })
}

test('dashboard: upload files right from the quick actions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page)
  await page.getByTestId('dashboard-file-input').setInputFiles({
    name: 'from-dashboard.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await expect(page.getByText('Готово')).toBeVisible()
  await page.getByRole('link', { name: 'Открыть медиатеку' }).click()
  await expect(page.getByRole('button', { name: 'Открыть файл from-dashboard.png' })).toBeVisible()
})

test('moving to another section focuses the content and names the tab', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page)
  await page
    .getByRole('navigation', { name: 'Разделы' })
    .getByRole('link', { name: 'Проекты' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Проекты' })).toBeVisible()
  await expect(page).toHaveTitle(/^Проекты — /)
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('admin-main')
})
