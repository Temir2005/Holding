import { expect, type APIRequestContext, type Page } from '@playwright/test'

interface Credentials {
  email: string
  password: string
}

export const admin: Credentials = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@example.com',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'e2e-password-not-secret',
}

export const editor: Credentials = {
  email: 'e2e-editor@example.com',
  password: 'e2e-editor-password',
}

/** Signs in through the login form and waits for the admin shell. */
export async function signIn(page: Page, path = '/admin', user: Credentials = admin) {
  await page.goto(path)
  await page.getByLabel('Email').fill(user.email)
  await page.getByRole('textbox', { name: 'Пароль', exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('button', { name: 'Меню профиля' })).toBeVisible()
}

/** Screen sizes from the brief: phone, tablet, desktop, wide desktop. */
export const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1920, height: 1080 },
] as const

/** Creates the editor account through the API (as the admin) unless it exists. */
export async function ensureEditor(request: APIRequestContext): Promise<Credentials> {
  const login = await request.post('/api/v1/admin/auth/login', { data: admin })
  expect(login.ok()).toBeTruthy()
  const { access_token: token } = (await login.json()) as { access_token: string }
  const created = await request.post('/api/v1/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...editor, full_name: 'E2E Editor', role: 'editor' },
  })
  expect([201, 409]).toContain(created.status())
  return editor
}
