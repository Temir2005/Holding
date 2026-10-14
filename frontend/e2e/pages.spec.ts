import { expect, test, type Page } from '@playwright/test'
import { signIn } from './helpers'

const shot = (name: string) => ({ path: `e2e/screenshots/${name}.png`, fullPage: true })

async function openHome(page: Page) {
  await signIn(page, '/admin/pages')
  await page.getByRole('link', { name: /\/home/ }).click()
  await expect(page.getByRole('tab', { name: 'Блоки' })).toBeVisible()
}

/** Opens the first block (the hero on the seeded home page). */
async function openFirstBlock(page: Page) {
  await page.getByRole('button', { name: /^1\s/ }).click()
  return page.getByRole('dialog', { name: /Главный экран/ })
}

test.describe('pages and blocks', () => {
  test('edit a block, see it in the preview, publish it and roll back', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, '/admin/pages')
    await expect(page.getByRole('link', { name: /\/home/ })).toBeVisible()
    await page.screenshot(shot('pages-list-1440'))
    await page.getByRole('link', { name: /\/home/ }).click()

    const editor = await openFirstBlock(page)
    const title = editor.getByRole('textbox', { name: 'Заголовок', exact: true })
    const original = await title.inputValue()
    const changed = `${original} — e2e`
    await title.fill(changed)
    await page.screenshot(shot('block-editor-1440'))
    await editor.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Блок сохранён').first()).toBeVisible()
    await expect(page.getByText('Есть неопубликованные изменения')).toBeVisible()

    // The preview next to the editor shows the draft through the site's preview route.
    const preview = page.frameLocator('iframe[title^="Предпросмотр страницы"]')
    await expect(preview.getByText(changed).first()).toBeVisible()
    await expect(preview.getByText('Предпросмотр — это не опубликованная версия')).toBeVisible()
    await page.screenshot(shot('page-editor-1440'))

    // Not on the live site until published.
    const site = await page.context().newPage()
    await site.goto('/ru')
    await expect(site.getByText(original).first()).toBeVisible()

    await page.getByRole('button', { name: 'Опубликовать', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Опубликовать страницу' })
    await dialog.getByLabel('Что изменилось').fill('e2e: новый заголовок')
    await dialog.getByRole('button', { name: 'Опубликовать' }).click()
    await expect(page.getByText('Страница опубликована').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Опубликовать', exact: true })).toBeDisabled()

    await site.reload()
    await expect(site.getByText(changed).first()).toBeVisible()

    // Roll back to the previous version and publish it at once.
    await page.getByRole('button', { name: 'Ещё действия' }).click()
    await page.getByRole('menuitem', { name: 'История версий' }).click()
    const history = page.getByRole('dialog', { name: 'История версий' })
    await expect(history.getByText('e2e: новый заголовок')).toBeVisible()
    await page.screenshot(shot('history-1440'))
    const previous = history.getByRole('listitem').nth(1)
    await previous.getByRole('button', { name: 'Восстановить и опубликовать' }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Восстановить и опубликовать' })
      .click()
    await expect(page.getByText('Версия восстановлена и опубликована').first()).toBeVisible()

    await site.reload()
    await expect(site.getByText(original).first()).toBeVisible()
    await expect(site.getByText(changed)).toHaveCount(0)
  })

  test('create a page, add a block, publish and delete it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page, '/admin/pages')
    await page.getByRole('button', { name: 'Новая страница' }).click()
    const create = page.getByRole('dialog', { name: 'Новая страница' })
    await create.getByRole('textbox', { name: 'Адрес' }).fill('e2e-page')
    await create.getByRole('textbox', { name: 'Название' }).fill('Страница e2e')
    await create.getByRole('button', { name: 'Создать' }).click()
    await expect(page.getByRole('heading', { name: 'Страница e2e' })).toBeVisible()
    await expect(page.getByText('Не публиковалась')).toBeVisible()

    await page.getByRole('button', { name: 'Добавить блок' }).click()
    await page
      .getByRole('dialog', { name: 'Какой блок добавить?' })
      .getByRole('button', { name: /^Цитата/ })
      .click()
    const editor = page.getByRole('dialog', { name: 'Новый блок: Цитата' })
    await editor.getByRole('textbox', { name: 'Цитата' }).fill('Первая цитата e2e')
    await editor.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Блок добавлен').first()).toBeVisible()

    await page.getByRole('button', { name: 'Опубликовать', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Опубликовать страницу' })
      .getByRole('button', { name: 'Опубликовать' })
      .click()
    await expect(page.getByText('На сайте', { exact: true })).toBeVisible()

    const site = await page.context().newPage()
    await site.goto('/ru/e2e-page')
    await expect(site.getByText('Первая цитата e2e')).toBeVisible()

    // Deleting takes the page off the site, with its history.
    await page.getByRole('button', { name: 'Ещё действия' }).click()
    await page.getByRole('menuitem', { name: 'Удалить страницу' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить страницу' }).click()
    await expect(page.getByText('Страница удалена').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /\/e2e-page/ })).toHaveCount(0)
    await site.reload()
    await expect(site.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
  })

  test('works on a phone: edit a text and publish', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openHome(page)
    await page.screenshot(shot('page-editor-375'))
    const editor = await openFirstBlock(page)
    const subtitle = editor.getByRole('textbox', { name: 'Подзаголовок' })
    await subtitle.fill(`${await subtitle.inputValue()} (тел.)`)
    await page.screenshot(shot('block-editor-375'))
    await editor.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Блок сохранён').first()).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: 'Опубликовать', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Опубликовать страницу' })
      .getByRole('button', { name: 'Опубликовать' })
      .click()
    await expect(page.getByText('Страница опубликована').first()).toBeVisible()
  })

  test('a preview link without a valid token explains itself and is not indexed', async ({
    page,
  }) => {
    await page.goto('/ru/preview/home?token=expired')
    await expect(
      page.getByRole('heading', { name: 'Ссылка на предпросмотр устарела' }),
    ).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
  })
})
