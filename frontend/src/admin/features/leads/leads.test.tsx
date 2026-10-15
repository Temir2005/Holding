import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lead } from '../../api/leads'
import { fakeFetch, json, signedIn } from '../../test/fakeApi'
import { withProviders } from '../../test/renderForm'
import { periodEnd, periodStart } from '../period'
import { LeadsPage } from './LeadsPage'

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'l1',
    created_at: '2026-10-12T09:30:00Z',
    updated_at: '2026-10-12T09:30:00Z',
    type: 'partner',
    status: 'new',
    name: 'Айгерим',
    phone: '+7 700 111 22 33',
    email: null,
    message: 'Хотим обсудить поставку панелей',
    source_page: 'home',
    locale: 'ru',
    manager_note: null,
    version: 1,
    ...overrides,
  }
}

const listOf = (items: Lead[]) => ({ items, total: items.length, page: 1, page_size: 50 })

function renderLeads(path = '/admin/leads') {
  const user = userEvent.setup()
  render(withProviders(<LeadsPage />, path))
  return user
}

describe('period of days', () => {
  it('starts at local midnight and ends before the next day, with the offset', () => {
    const start = periodStart('2026-10-01')
    const end = periodEnd('2026-10-31')
    expect(start).toMatch(/^2026-10-01T00:00:00[+-]\d{2}:\d{2}$/)
    expect(end).toMatch(/^2026-11-01T00:00:00[+-]\d{2}:\d{2}$/)
    expect(periodStart(null)).toBeNull()
    expect(periodEnd('not a day')).toBeNull()
  })
})

describe('leads', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('moves a new lead to work in one click and updates the counter', async () => {
    const bodies: unknown[] = []
    const { calls } = fakeFetch({
      'GET /api/v1/admin/leads': () => json(200, listOf([lead()])),
      'PATCH /api/v1/admin/leads/{id}': ({ body }) => {
        bodies.push(body)
        return json(200, lead({ status: 'in_progress', version: 2 }))
      },
    })
    const user = renderLeads()
    const row = within(await screen.findByRole('list', { name: 'Заявки' })).getByRole('listitem')
    expect(within(row).getByText('Айгерим')).toBeTruthy()
    await user.click(within(row).getByRole('button', { name: 'Взять в работу' }))
    await waitFor(() => expect(bodies).toEqual([{ version: 1, status: 'in_progress' }]))
    expect(await within(row).findByRole('button', { name: 'Обработана' })).toBeTruthy()
    expect(calls.filter((c) => c.startsWith('GET /api/v1/admin/leads?')).length).toBeGreaterThan(0)
  })

  it('filters by status and period through the API', async () => {
    const { calls } = fakeFetch({ 'GET /api/v1/admin/leads': () => json(200, listOf([lead()])) })
    renderLeads('/admin/leads?status=new&from=2026-10-01&to=2026-10-31')
    await screen.findByText('Айгерим')
    const request = new URL(`http://x${(calls[0] ?? '').replace(/^GET /, '')}`)
    expect(request.searchParams.get('status')).toBe('new')
    expect(request.searchParams.get('created_from')).toMatch(/^2026-10-01T00:00:00/)
    expect(request.searchParams.get('created_to')).toMatch(/^2026-11-01T00:00:00/)
  })

  it('saves the manager note from the lead panel', async () => {
    const bodies: unknown[] = []
    fakeFetch({
      'GET /api/v1/admin/leads': () => json(200, listOf([lead()])),
      'PATCH /api/v1/admin/leads/{id}': ({ body }) => {
        bodies.push(body)
        return json(200, lead({ manager_note: 'Перезвонить', version: 2 }))
      },
    })
    const user = renderLeads()
    await user.click(await screen.findByRole('button', { name: 'Открыть заявку: Айгерим' }))
    const panel = await screen.findByRole('dialog', { name: 'Заявка: Айгерим' })
    expect(within(panel).getByText('Хотим обсудить поставку панелей')).toBeTruthy()
    await user.type(within(panel).getByLabelText('Заметка менеджера'), 'Перезвонить')
    await user.click(within(panel).getByRole('button', { name: 'Сохранить заметку' }))
    await waitFor(() => expect(bodies).toEqual([{ version: 1, manager_note: 'Перезвонить' }]))
  })

  it('exports CSV with the current filters', async () => {
    const urls: string[] = []
    fakeFetch({
      'GET /api/v1/admin/leads': () => json(200, listOf([lead()])),
      'GET /api/v1/admin/leads/export': ({ url }) => {
        urls.push(url.search)
        return new Response('Дата;Имя\n', {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="leads-2026-10-15.csv"' },
        })
      },
    })
    const createUrl = vi.fn(() => 'blob:csv')
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() }),
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = renderLeads('/admin/leads?type=partner')
    await screen.findByText('Айгерим')
    await user.click(screen.getByRole('button', { name: 'Выгрузить CSV' }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(urls).toEqual(['?type=partner'])
    expect(createUrl).toHaveBeenCalled()
  })
})
