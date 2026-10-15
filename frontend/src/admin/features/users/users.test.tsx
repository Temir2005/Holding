import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUser } from '../../api/users'
import { SessionContext } from '../../session/context'
import { apiError, fakeFetch, json, signedIn } from '../../test/fakeApi'
import { withProviders } from '../../test/renderForm'
import { UsersPage } from './UsersPage'

function account(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u1',
    email: 'admin@example.com',
    full_name: 'Админ',
    role: 'admin',
    is_active: true,
    last_login_at: '2026-10-14T08:00:00Z',
    created_at: '2026-10-01T00:00:00Z',
    version: 1,
    ...overrides,
  }
}

const me = account()
const other = account({
  id: 'u2',
  email: 'editor@example.com',
  full_name: 'Редактор Р.',
  role: 'editor',
})
const list = { items: [me, other], total: 2, page: 1, page_size: 100 }

function renderUsers() {
  const user = userEvent.setup()
  render(
    withProviders(
      <SessionContext.Provider value={{ status: 'signed-in', user: me }}>
        <UsersPage />
      </SessionContext.Provider>,
      '/admin/users',
    ),
  )
  return user
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(await screen.findByRole('button', { name: `Действия с пользователем ${name}` }))

describe('users', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('explains why one cannot lock oneself out, and offers no own password reset', async () => {
    fakeFetch({ 'GET /api/v1/admin/users': () => json(200, list) })
    const user = renderUsers()
    await openMenu(user, 'Админ')
    expect(screen.queryByRole('menuitem', { name: 'Задать новый пароль' })).toBeNull()
    await user.click(screen.getByRole('menuitem', { name: 'Изменить' }))
    const dialog = await screen.findByRole('dialog', { name: 'Пользователь: Админ' })
    expect(within(dialog).getByText(/Себе нельзя снять роль администратора/)).toBeTruthy()
    expect(within(dialog).getByRole('switch', { name: 'Может входить в админку' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(within(dialog).getByRole('radio', { name: /Редактор/ })).toHaveProperty('disabled', true)
  })

  it('shows the server reason when the last admin would be lost', async () => {
    fakeFetch({
      'GET /api/v1/admin/users': () => json(200, list),
      'PATCH /api/v1/admin/users/{id}': ({ body }) => {
        expect(body).toMatchObject({ version: 1, is_active: false })
        return apiError(409, 'LAST_ADMIN', 'Должен остаться хотя бы один активный администратор')
      },
    })
    const user = renderUsers()
    await openMenu(user, 'Редактор Р.')
    await user.click(screen.getByRole('menuitem', { name: 'Изменить' }))
    const dialog = await screen.findByRole('dialog', { name: 'Пользователь: Редактор Р.' })
    await user.click(within(dialog).getByRole('switch', { name: 'Может входить в админку' }))
    await user.click(within(dialog).getByRole('button', { name: 'Сохранить' }))
    expect(
      await within(dialog).findByText('Должен остаться хотя бы один активный администратор'),
    ).toBeTruthy()
  })

  it('creates a user with a role and a password', async () => {
    let posted: unknown
    fakeFetch({
      'GET /api/v1/admin/users': () => json(200, list),
      'POST /api/v1/admin/users': ({ body }) => {
        posted = body
        return json(201, account({ id: 'u3', role: 'editor' }))
      },
    })
    const user = renderUsers()
    await user.click(await screen.findByRole('button', { name: 'Новый пользователь' }))
    const dialog = await screen.findByRole('dialog', { name: 'Новый пользователь' })
    await user.type(within(dialog).getByRole('textbox', { name: /^Email/ }), 'new@example.com')
    await user.type(within(dialog).getByRole('textbox', { name: /^Имя/ }), 'Новый Человек')
    await user.type(within(dialog).getByLabelText(/^Пароль/), 'short')
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }))
    expect(within(dialog).getByText('Пароль должен быть не короче 10 символов')).toBeTruthy()
    await user.clear(within(dialog).getByLabelText(/^Пароль/))
    await user.type(within(dialog).getByLabelText(/^Пароль/), 'long-enough-password')
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }))
    await waitFor(() =>
      expect(posted).toEqual({
        email: 'new@example.com',
        full_name: 'Новый Человек',
        role: 'editor',
        password: 'long-enough-password',
      }),
    )
  })

  it('sets a new password for someone else', async () => {
    let body: unknown
    fakeFetch({
      'GET /api/v1/admin/users': () => json(200, list),
      'POST /api/v1/admin/users/{id}/password': (req) => {
        body = req.body
        expect(req.url.pathname).toBe('/api/v1/admin/users/u2/password')
        return json(200, other)
      },
    })
    const user = renderUsers()
    await openMenu(user, 'Редактор Р.')
    await user.click(screen.getByRole('menuitem', { name: 'Задать новый пароль' }))
    const dialog = await screen.findByRole('dialog', { name: 'Новый пароль: Редактор Р.' })
    await user.type(within(dialog).getByLabelText(/^Новый пароль/), 'brand-new-password')
    await user.type(within(dialog).getByLabelText(/^Повторите/), 'brand-new-password')
    await user.click(within(dialog).getByRole('button', { name: 'Задать новый пароль' }))
    await waitFor(() => expect(body).toEqual({ new_password: 'brand-new-password' }))
  })
})
