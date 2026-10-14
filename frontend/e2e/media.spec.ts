import { expect, test, type Page } from '@playwright/test'
import { signIn } from './helpers'

const shot = (name: string) => ({ path: `e2e/screenshots/${name}.png`, fullPage: true })

/** A real 2×2 PNG: the backend checks the content, reads the size and makes copies. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
)

async function upload(page: Page, name: string) {
  await page.getByTestId('media-file-input').first().setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: PNG,
  })
}

test.describe('media library', () => {
  test('uploads to storage, edits the caption and tags', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page, '/admin/media')
    await expect(page.getByRole('heading', { name: 'Медиатека' })).toBeVisible()
    await page.screenshot(shot('media-library-1280'))

    await upload(page, 'e2e-pixel.png')
    await expect(page.getByText('Готово')).toBeVisible()
    await page.getByRole('button', { name: 'Открыть файл e2e-pixel.png' }).click()

    const card = page.getByRole('dialog', { name: 'e2e-pixel.png' })
    await expect(card.getByText('2 × 2')).toBeVisible()
    await card.getByRole('textbox', { name: 'Подпись (alt)' }).fill('Тестовый пиксель')
    await card.getByRole('textbox', { name: 'Теги' }).fill('e2e')
    await card.getByRole('textbox', { name: 'Теги' }).press('Enter')
    await card.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Изменения сохранены').first()).toBeVisible()
    await page.screenshot(shot('media-card-1280'))

    // The search finds the file by its tag.
    await card.getByRole('button', { name: 'Закрыть' }).click()
    await page.getByPlaceholder('Поиск по имени, подписи и тегам').fill('e2e')
    await expect(page.getByRole('button', { name: 'Открыть файл e2e-pixel.png' })).toBeVisible()

    await page.getByRole('button', { name: 'Открыть файл e2e-pixel.png' }).click()
    await card.getByRole('button', { name: 'Удалить файл' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить файл' }).click()
    await expect(page.getByText('Файл удалён').first()).toBeVisible()
  })

  test('refuses to delete a file used on the site and lists the places', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page, '/admin/media')
    // The seeded hero picture is used by the home page.
    await page.getByRole('button', { name: 'Открыть файл hero-skyline.jpg' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить файл' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить файл' }).click()
    const refused = page.getByRole('dialog', { name: 'Нельзя удалить: объект используется' })
    await expect(refused).toBeVisible()
    await expect(refused.getByRole('listitem').first()).toBeVisible()
  })

  test('works on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await signIn(page, '/admin/media')
    await expect(page.getByRole('button', { name: /^Открыть файл/ }).first()).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await page.screenshot(shot('media-library-375'))
    await page
      .getByRole('button', { name: /^Открыть файл/ })
      .first()
      .click()
    await expect(page.getByRole('textbox', { name: 'Подпись (alt)' })).toBeVisible()
    await page.screenshot(shot('media-card-375'))
  })

  test('a block field uploads a file right from the picker and selects it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page, '/admin/dev/forms')
    await page.getByLabel('Тип блока').selectOption('hero')
    await page.getByRole('button', { name: 'Выбрать файл' }).first().click()
    const picker = page.getByRole('dialog', { name: 'Выбор файла' })
    await expect(picker.getByRole('button', { name: /^Выбрать «/ }).first()).toBeVisible()
    await page.screenshot(shot('media-picker-1280'))
    await upload(page, 'e2e-hero.png')
    await expect(picker).toBeHidden()
    await expect(page.getByText('e2e-hero.png')).toBeVisible()
  })
})
