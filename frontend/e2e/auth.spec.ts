import { expect, test } from '@playwright/test'
import { admin, signIn } from './helpers'

test.describe('sign-in and session', () => {
  test('rejects a wrong password with a readable message', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill(admin.email)
    await page.getByRole('textbox', { name: 'Пароль', exact: true }).fill('wrong-password-123')
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page.getByRole('alert')).toHaveText('Неверный email или пароль')
  })

  test('returns to the requested page after sign-in', async ({ page }) => {
    await page.goto('/admin/collections/projects')
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fcollections%2Fprojects/)
    await page.getByLabel('Email').fill(admin.email)
    await page.getByRole('textbox', { name: 'Пароль', exact: true }).fill(admin.password)
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page).toHaveURL(/\/admin\/collections\/projects$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Проекты' })).toBeVisible()
  })

  test('keeps the session across reloads and shares it with a second tab', async ({
    page,
    context,
  }) => {
    await signIn(page)
    // A secure context, as on the real https site: tabs coordinate through Web Locks.
    expect(await page.evaluate(() => typeof navigator.locks?.request)).toBe('function')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Меню профиля' })).toBeVisible()

    // A second tab restores the session from the same cookie without revoking the first.
    const second = await context.newPage()
    await second.goto('/admin/pages')
    await expect(second.getByRole('heading', { level: 1, name: 'Страницы' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Меню профиля' })).toBeVisible()
  })

  test('signs out every tab of the browser', async ({ page, context }) => {
    await signIn(page)
    const second = await context.newPage()
    await second.goto('/admin')
    await expect(second.getByRole('button', { name: 'Меню профиля' })).toBeVisible()

    await page.getByRole('button', { name: 'Меню профиля' }).click()
    await page.getByRole('menuitem', { name: 'Выйти' }).click()
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(second).toHaveURL(/\/admin\/login/)
  })

  test('is never indexed and keeps the site body class intact', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await expect(page.locator('body')).toHaveClass('admin')

    await page.goto('/ru')
    await expect(page.locator('body')).toHaveClass('tone-dark')
  })
})
