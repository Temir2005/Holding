import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changedFields, type AuditEntry } from '../../api/audit'
import { fakeFetch, json, signedIn } from '../../test/fakeApi'
import { withProviders } from '../../test/renderForm'
import { AuditPage } from './AuditPage'

const update: AuditEntry = {
  id: 'a1',
  action: 'update',
  entity_type: 'project',
  entity_id: 'pr1',
  changes: { title: [{ ru: 'Старое' }, { ru: 'Новое' }], year: [null, 2026] },
  user: { id: 'u1', email: 'admin@example.com', full_name: 'Админ' },
  created_at: '2026-10-14T10:00:00Z',
}
const publish: AuditEntry = {
  id: 'a2',
  action: 'publish',
  entity_type: 'page',
  entity_id: 'p1',
  changes: { revision: 5, comment: 'Новый текст' },
  user: null,
  created_at: '2026-10-14T09:00:00Z',
}

const routes = {
  'GET /api/v1/admin/users': () => json(200, { items: [], total: 0, page: 1, page_size: 100 }),
  'GET /api/v1/admin/audit-log': () =>
    json(200, { items: [update, publish], total: 2, page: 1, page_size: 50 }),
}

describe('audit log', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('reads updates as before → after pairs only', () => {
    expect(changedFields(update)).toEqual([
      ['title', { ru: 'Старое' }, { ru: 'Новое' }],
      ['year', null, 2026],
    ])
    expect(changedFields(publish)).toBeNull()
  })

  it('opens an entry with field names from the form and before → after', async () => {
    fakeFetch(routes)
    const user = userEvent.setup()
    render(withProviders(<AuditPage />, '/admin/audit'))
    const list = await screen.findByRole('list', { name: 'Журнал действий' })
    const [first, second] = within(list).getAllByRole('listitem')
    expect(
      within(first as HTMLElement)
        .getByRole('link', { name: /Проект/ })
        .getAttribute('href'),
    ).toBe('/admin/collections/projects/pr1')
    expect(within(second as HTMLElement).getByText('Система')).toBeTruthy()

    await user.click(within(first as HTMLElement).getByRole('button', { name: /Подробности/ }))
    const table = within(first as HTMLElement).getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(within(rows[1] as HTMLElement).getByRole('rowheader').textContent).toBe('Название')
    expect(within(rows[1] as HTMLElement).getByText('Старое')).toBeTruthy()
    expect(within(rows[1] as HTMLElement).getByText('Новое')).toBeTruthy()
    expect(within(rows[2] as HTMLElement).getByRole('rowheader').textContent).toBe('Год')
  })

  it('names fields outside the forms in Russian too', async () => {
    fakeFetch({
      ...routes,
      'GET /api/v1/admin/audit-log': () =>
        json(200, {
          items: [{ ...update, entity_type: 'admin_user', changes: { is_active: [true, false] } }],
          total: 1,
          page: 1,
          page_size: 50,
        }),
    })
    const user = userEvent.setup()
    render(withProviders(<AuditPage />, '/admin/audit'))
    await user.click(await screen.findByRole('button', { name: /Подробности/ }))
    expect(screen.getByRole('rowheader').textContent).toBe('Может входить')
    expect(screen.getByText('Да')).toBeTruthy()
    expect(screen.getByText('Нет')).toBeTruthy()
  })

  it('filters by what changed through the API', async () => {
    const { calls } = fakeFetch(routes)
    const user = userEvent.setup()
    render(withProviders(<AuditPage />, '/admin/audit'))
    await screen.findByRole('list', { name: 'Журнал действий' })
    await user.selectOptions(screen.getByLabelText('Что изменили'), 'page')
    await waitFor(() =>
      expect(calls.some((c) => c.includes('/audit-log?') && c.includes('entity_type=page'))).toBe(
        true,
      ),
    )
  })
})
