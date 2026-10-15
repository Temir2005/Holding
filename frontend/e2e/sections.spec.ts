import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

const shot = (name: string) => ({ path: `e2e/screenshots/${name}.png`, fullPage: true })

test.describe('settings, leads, users, audit log', () => {
  test('site settings: change the footer and see it on the site', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, '/admin/settings')
    const legal = page.getByRole('textbox', { name: /^Юридическая строка/ })
    const changed = '© MegaSmart — правка из e2e'
    await legal.fill(changed)
    await page.screenshot(shot('settings-1440'))
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Настройки сайта сохранены').first()).toBeVisible()

    const site = await page.context().newPage()
    await site.goto('/ru')
    await expect(site.getByText(changed)).toBeVisible()
  })

  test('leads on a phone: take one to work, add a note, export CSV', async ({ page, request }) => {
    const sent = await request.post('/api/v1/leads', {
      data: {
        name: 'Лид e2e',
        phone: '+7 700 000 00 01',
        type: 'partner',
        message: 'Хотим обсудить партнёрство',
        source_page: 'home',
      },
    })
    expect(sent.ok()).toBeTruthy()

    await page.setViewportSize({ width: 375, height: 812 })
    await signIn(page, '/admin/leads')
    const row = page.getByRole('listitem').filter({ hasText: 'Лид e2e' })
    await row.getByRole('button', { name: 'Взять в работу' }).click()
    await expect(page.getByText('Статус заявки изменён').first()).toBeVisible()
    await expect(row.getByRole('button', { name: 'Обработана' })).toBeVisible()
    await page.screenshot(shot('leads-375'))
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    await row.getByRole('button', { name: 'Открыть заявку: Лид e2e' }).click()
    const panel = page.getByRole('dialog', { name: 'Заявка: Лид e2e' })
    await panel.getByLabel('Заметка менеджера').fill('Перезвонить завтра')
    await panel.getByRole('button', { name: 'Сохранить заметку' }).click()
    await expect(page.getByText('Заметка сохранена').first()).toBeVisible()
    await page.screenshot(shot('lead-375'))
    await panel.getByRole('button', { name: 'Закрыть' }).click()
    await expect(panel).toBeHidden()

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Выгрузить CSV' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^leads-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  test('users: create an editor, disable them; the log shows who did what', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, '/admin/users')
    await page.getByRole('button', { name: 'Новый пользователь' }).click()
    const create = page.getByRole('dialog', { name: 'Новый пользователь' })
    await create.getByRole('textbox', { name: /^Email/ }).fill('e2e-new@example.com')
    await create.getByRole('textbox', { name: /^Имя/ }).fill('Новый редактор')
    await create.getByLabel(/^Пароль/).fill('new-editor-password')
    await create.getByRole('button', { name: 'Создать' }).click()
    await expect(page.getByText('Пользователь создан').first()).toBeVisible()

    await page.getByRole('button', { name: 'Действия с пользователем Новый редактор' }).click()
    await page.getByRole('menuitem', { name: 'Изменить' }).click()
    const edit = page.getByRole('dialog', { name: 'Пользователь: Новый редактор' })
    await edit.getByRole('switch', { name: 'Может входить в админку' }).click()
    await edit.getByRole('button', { name: 'Сохранить' }).click()
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Новый редактор' }).getByText('Отключён'),
    ).toBeVisible()
    await page.screenshot(shot('users-1440'))

    await page.goto('/admin/audit')
    const list = page.getByRole('list', { name: 'Журнал действий' })
    await page.getByLabel('Что изменили').selectOption('admin_user')
    const entry = list.getByRole('listitem').filter({ hasText: 'Изменение' }).first()
    await entry.getByRole('button', { name: /Подробности/ }).click()
    await expect(entry.getByRole('table')).toContainText('Было')
    await page.screenshot(shot('audit-1440'))
  })
})
