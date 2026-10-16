import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUser } from '../../api/client'
import { SessionContext } from '../../session/context'
import { apiError, fakeFetch, json, signedIn } from '../../test/fakeApi'
import { withProviders } from '../../test/renderForm'
import { CollectionListPage } from '../collections/CollectionListPage'
import { listOf, project } from '../collections/testData'
import { pageDetail } from '../pages/testData'
import { DashboardPage } from './DashboardPage'

const user = (role: CurrentUser['role']): CurrentUser => ({
  id: 'u1',
  email: 'me@example.com',
  full_name: 'Айдана',
  role,
  is_active: true,
  last_login_at: null,
  created_at: '2026-10-01T00:00:00Z',
  version: 1,
})

const summary = pageDetail()
const pages = {
  items: [
    { ...summary, id: 'p1', slug: 'about', title: { ru: 'О нас' }, has_unpublished_changes: true },
    {
      ...summary,
      id: 'p2',
      slug: 'home',
      title: { ru: 'Главная' },
      has_unpublished_changes: false,
    },
  ],
  total: 2,
  page: 1,
  page_size: 100,
}
const newLeads = {
  items: [
    {
      id: 'l1',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T09:00:00Z',
      type: 'investor',
      status: 'new',
      name: 'Ерлан',
      phone: '+7 700 000 00 00',
      email: null,
      message: null,
      source_page: 'home',
      locale: 'ru',
      manager_note: null,
      version: 1,
    },
  ],
  total: 7,
  page: 1,
  page_size: 5,
}
const audit = {
  items: [
    {
      id: 'a1',
      action: 'update',
      entity_type: 'project',
      entity_id: 'pr1',
      changes: {},
      user: { id: 'u1', email: 'me@example.com', full_name: 'Айдана' },
      created_at: '2026-10-15T08:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  page_size: 8,
}

function renderDashboard(role: CurrentUser['role']) {
  render(
    withProviders(
      <SessionContext.Provider value={{ status: 'signed-in', user: user(role) }}>
        <DashboardPage />
      </SessionContext.Provider>,
      '/admin',
    ),
  )
}

describe('dashboard', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('shows new leads, pages with unpublished changes and the latest actions', async () => {
    fakeFetch({
      'GET /api/v1/admin/leads': ({ url }) => {
        expect(url.searchParams.get('status')).toBe('new')
        return json(200, newLeads)
      },
      'GET /api/v1/admin/pages': () => json(200, pages),
      'GET /api/v1/admin/audit-log': () => json(200, audit),
    })
    renderDashboard('admin')
    const leads = (await screen.findByRole('heading', { name: /Новые заявки/ })).closest('section')
    expect(await within(leads as HTMLElement).findByText('7')).toBeTruthy()
    expect(
      within(leads as HTMLElement)
        .getByRole('link', { name: /Ерлан/ })
        .getAttribute('href'),
    ).toBe('/admin/leads?lead=l1')

    const unpublished = screen
      .getByRole('heading', { name: 'Неопубликованные изменения' })
      .closest('section') as HTMLElement
    expect(await within(unpublished).findByText('О нас')).toBeTruthy()
    expect(within(unpublished).queryByText('Главная')).toBeNull()

    expect(await screen.findByRole('link', { name: 'Изменение: проект' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Новый проект/ }).getAttribute('href')).toBe(
      '/admin/collections/projects/new',
    )
  })

  it('does not ask an editor for the audit log', async () => {
    const { calls } = fakeFetch({
      'GET /api/v1/admin/leads': () => json(200, { ...newLeads, items: [], total: 0 }),
      'GET /api/v1/admin/pages': () => json(200, pages),
    })
    renderDashboard('editor')
    expect(await screen.findByText('Новых заявок нет')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Последние действия' })).toBeNull()
    expect(calls.some((c) => c.includes('audit-log'))).toBe(false)
  })
})

describe('a list that failed to load', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('says so instead of looking empty, and retries', async () => {
    let failing = true
    fakeFetch({
      'GET /api/v1/admin/lookup': () => json(200, []),
      'GET /api/v1/admin/projects': () =>
        failing ? apiError(500, 'INTERNAL_ERROR', 'Ошибка') : json(200, listOf([project()])),
    })
    const user = userEvent.setup()
    render(
      withProviders(
        <CollectionListPage />,
        '/admin/collections/projects',
        '/admin/collections/:collection',
      ),
    )
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Не удалось загрузить данные')).toBeTruthy()
    expect(screen.queryByText('Записей пока нет — добавьте первую')).toBeNull()
    failing = false
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(screen.getByText('Alatau City')).toBeTruthy())
  })
})
