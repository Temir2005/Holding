import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

/** Screenshots land in e2e/screenshots (not committed) for the stage report. */
const shot = (name: string) => ({ path: `e2e/screenshots/${name}.png`, fullPage: true })

test.describe('block forms built from the schema', () => {
  for (const width of [375, 1280]) {
    test(`every block type renders without fallbacks at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const warnings: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'warning' && m.text().includes('[SchemaForm]')) warnings.push(m.text())
      })
      await signIn(page, '/admin/dev/forms')
      const select = page.getByLabel('Тип блока')
      // Block types come from the API; wait until they are loaded.
      await expect(select.locator('option')).toHaveCount(22)
      const types = await select
        .locator('option')
        .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
      for (const type of types) {
        await select.selectOption(type)
        await expect(page.locator('form')).toBeVisible()
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, `horizontal scroll on ${type}`).toBeLessThanOrEqual(0)
      }
      expect(warnings).toEqual([])

      for (const type of ['hero', 'capabilities', 'about_text']) {
        await select.selectOption(type)
        await page.screenshot(shot(`form-${type}-${width}`))
      }
    })
  }

  test('fills a block in two languages and gets stored data', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page, '/admin/dev/forms')
    await page.getByLabel('Тип блока').selectOption('process_steps')

    await page.getByRole('button', { name: 'Проверить' }).click()
    await expect(page.getByTestId('stored')).toContainText('"steps": []')

    await page.getByRole('button', { name: 'Добавить: Этап' }).click()
    await page.getByRole('textbox', { name: 'Название этапа' }).fill('Проектирование')
    await page.getByRole('textbox', { name: 'Описание' }).fill('Готовим проект')
    await page
      .getByRole('group', { name: 'Язык текстов' })
      .getByRole('button', { name: 'KZ' })
      .click()
    await expect(page.getByRole('textbox', { name: 'Название этапа' })).toHaveAttribute(
      'placeholder',
      'Проектирование',
    )
    await page.getByRole('textbox', { name: 'Название этапа' }).fill('Жобалау')

    await page.keyboard.press('Control+s')
    const stored = page.getByTestId('stored')
    await expect(stored).toContainText('"ru": "Проектирование"')
    await expect(stored).toContainText('"kk": "Жобалау"')
    await expect(stored).toContainText('"eyebrow": null')
  })

  test('warns before leaving with unsaved changes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page, '/admin/dev/forms')
    await page.getByLabel('Тип блока').selectOption('quote')
    await page.getByRole('textbox', { name: 'Цитата' }).fill('Черновик')
    await page
      .getByRole('navigation', { name: 'Разделы' })
      .getByRole('link', { name: 'Страницы' })
      .click()
    const dialog = page.getByRole('alertdialog', { name: 'Есть несохранённые изменения' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Отмена' }).click()
    await expect(page).toHaveURL(/\/admin\/dev\/forms$/)
    await page
      .getByRole('navigation', { name: 'Разделы' })
      .getByRole('link', { name: 'Страницы' })
      .click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Уйти без сохранения' }).click()
    await expect(page).toHaveURL(/\/admin\/pages$/)
  })
})
