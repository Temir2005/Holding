import { expect, test, type Page } from '@playwright/test'
import { signIn } from './helpers'

const shot = (name: string) => ({ path: `e2e/screenshots/${name}.png`, fullPage: true })

const row = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Проекты' }).getByRole('listitem').filter({ hasText: name })

test.describe('collections', () => {
  test('edit a project, see it on the site, hide and show it from the list', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, '/admin/collections/projects')
    await expect(row(page, 'ЖК «Проект A»')).toBeVisible()
    await page.screenshot(shot('collection-list-1440'))

    await row(page, 'ЖК «Проект A»').getByRole('link').click()
    await expect(page.getByRole('heading', { level: 1, name: 'ЖК «Проект A»' })).toBeVisible()
    const short = page.getByRole('textbox', { name: 'Коротко' })
    const changed = 'Жилой комплекс — правка из e2e'
    await short.fill(changed)
    await page.screenshot(shot('collection-item-1440'))
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Изменения сохранены').first()).toBeVisible()

    const site = await page.context().newPage()
    await site.goto('/ru/projects/zhk-proekt-a')
    await expect(site.getByText(changed)).toBeVisible()

    await page.getByRole('link', { name: 'Проекты' }).first().click()
    const toggle = row(page, 'ЖК «Проект A»').getByRole('switch')
    await toggle.click()
    await expect(page.getByText('Запись скрыта с сайта').first()).toBeVisible()
    await site.reload()
    await expect(site.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()

    await toggle.click()
    await expect(page.getByText('Запись показана на сайте').first()).toBeVisible()
    await site.reload()
    await expect(site.getByText(changed)).toBeVisible()
  })

  test('a project shown by a block cannot be deleted; the place opens in one click', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page, '/admin/collections/projects')
    await page.getByRole('button', { name: 'Действия с записью «AAAG»' }).click()
    await page.getByRole('menuitem', { name: 'Удалить' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить' }).click()
    const dialog = page.getByRole('dialog', { name: 'Не получилось удалить' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('link').first().click()
    // The page editor opens with the block that shows the project (the modal panel hides
    // the editor behind it from the accessibility tree, so the URL tells where we are).
    await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]+$/)
    await expect(page.getByRole('dialog', { name: /Токенизация/ })).toBeVisible()
  })

  test('works on a phone: create a person, put on the site, delete', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await signIn(page, '/admin/collections/people')
    await page.getByRole('link', { name: 'Новый сотрудник' }).first().click()
    await page.getByRole('textbox', { name: /^Имя и фамилия/ }).fill('Сотрудник e2e')
    await page.getByRole('textbox', { name: 'Должность' }).fill('Тестовая должность')
    await page.screenshot(shot('collection-item-375'))
    await page.getByRole('button', { name: 'Создать' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Сотрудник e2e' })).toBeVisible()
    await expect(page.getByText('Скрыта с сайта', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Сотрудники' }).first().click()
    const card = page
      .getByRole('list', { name: 'Сотрудники' })
      .getByRole('listitem')
      .filter({ hasText: 'Сотрудник e2e' })
    await card.getByRole('switch').click()
    await expect(page.getByText('Запись показана на сайте').first()).toBeVisible()
    await page.screenshot(shot('collection-list-375'))
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    await card.getByRole('button', { name: 'Действия с записью «Сотрудник e2e»' }).click()
    await page.getByRole('menuitem', { name: 'Удалить' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Запись удалена').first()).toBeVisible()
    await expect(card).toHaveCount(0)
  })
})
