import AxeBuilder from '@axe-core/playwright'
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

/**
 * Requests in flight, from Playwright's own events. `networkidle` belongs to a page load and
 * has long fired by the time the admin, after signing in, preloads the chunks of its sections.
 */
function trackNetwork(page: Page) {
  let inFlight = 0
  let changed = Date.now()
  const begin = () => {
    inFlight++
    changed = Date.now()
  }
  const end = () => {
    inFlight--
    changed = Date.now()
  }
  page.on('request', begin)
  page.on('requestfinished', end)
  page.on('requestfailed', end)
  /** Resolves once nothing has been loading for half a second. */
  return () =>
    expect
      .poll(() => inFlight === 0 && Date.now() - changed > 500, {
        message: 'the admin finished loading its section chunks',
        intervals: [100],
        timeout: 60_000,
      })
      .toBe(true)
}

/**
 * Signs in and waits for the state the sweep needs: the admin has preloaded the chunks of all
 * sections (AdminLayout → preloadSections). A section is a React.lazy inside a transition: while
 * its chunk is still on the way the previous screen stays up, so a heading check right after
 * the click races the dev server, the cause of the flaky «Медиатека» at 1280.
 */
async function signInAndSettle(page: Page) {
  const settled = trackNetwork(page)
  await signIn(page)
  await settled()
}

/**
 * Opens a section the way a person does, inside the app: the sidebar, or the link on the page
 * that leads there. No full reload, which would start the admin, the session and the chunks
 * over again for every section.
 */
async function open(page: Page, path: string) {
  if (path === 'home-editor') {
    await open(page, '/admin/pages')
    await page.getByRole('link', { name: /\/home/ }).click()
    await expect(page.getByRole('tab', { name: 'Блоки' })).toBeVisible()
    return
  }
  if (path === '/admin/collections/projects/new') {
    await open(page, '/admin/collections/projects')
    await page.locator(`main a[href="${path}"]`).first().click()
  } else {
    // the sidebar on wide screens, the bottom bar on narrow ones; on a phone the rest of the
    // sections are in the «Ещё» sheet of the bottom bar
    const shown = page.locator(`nav a[href="${path}"]:visible`)
    if (await shown.count()) await shown.first().click()
    else {
      await page.getByRole('button', { name: 'Ещё', exact: true }).click()
      await page.getByRole('dialog').locator(`a[href="${path}"]`).click()
    }
  }
  await expect(page).toHaveURL(path)
}

/**
 * WCAG 2.1 A/AA problems (contrast, ARIA, labels) found by axe, one line each. The preview
 * iframe shows the public site, which has its own checks.
 */
async function axeProblems(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('iframe')
    .analyze()
  return violations.flatMap((v) =>
    v.nodes.map(
      (n) => `${v.id}: ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1] ?? ''}`,
    ),
  )
}

for (const theme of ['light', 'dark'] as const) {
  test(`every section passes axe in the ${theme} theme`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await signInAndSettle(page)
    const found: string[] = []
    for (const section of SECTIONS) {
      await open(page, section.path)
      await expect(page.getByRole('heading', { level: 1, name: section.heading })).toBeVisible()
      await expect(page.locator('.animate-pulse')).toHaveCount(0)
      found.push(...(await axeProblems(page)).map((p) => `${section.name}: ${p}`))
    }
    // Panels and dialogs on top of a screen.
    await open(page, 'home-editor')
    await page.getByRole('button', { name: /^1\s/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    found.push(...(await axeProblems(page)).map((p) => `block editor: ${p}`))
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await open(page, '/admin/pages')
    await page.getByRole('button', { name: 'Новая страница' }).click()
    await expect(page.getByRole('dialog', { name: 'Новая страница' })).toBeVisible()
    found.push(...(await axeProblems(page)).map((p) => `new page dialog: ${p}`))
    expect(found).toEqual([])
  })
}

for (const viewport of VIEWPORTS) {
  test(`every section at ${viewport.width}px: fits, names its controls`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await signInAndSettle(page)
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
