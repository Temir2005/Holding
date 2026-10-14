import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiError, fakeFetch, json, signedIn } from '../../test/fakeApi'
import { withProviders } from '../../test/renderForm'
import { CollectionItemPage } from './CollectionItemPage'
import { CollectionListPage } from './CollectionListPage'
import { listOf, person, project } from './testData'

function renderList(path = '/admin/collections/projects') {
  const user = userEvent.setup()
  render(withProviders(<CollectionListPage />, path, '/admin/collections/:collection'))
  return user
}

function renderItem(path: string) {
  const user = userEvent.setup()
  render(withProviders(<CollectionItemPage />, path, '/admin/collections/:collection/:itemId'))
  return user
}

const lookup = { 'GET /api/v1/admin/lookup': () => json(200, []) }

describe('collection list', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('shows records with their columns and puts one on the site in one click', async () => {
    const bodies: unknown[] = []
    fakeFetch({
      ...lookup,
      'GET /api/v1/admin/projects': () => json(200, listOf([project()])),
      'PATCH /api/v1/admin/projects/{id}': ({ body }) => {
        bodies.push(body)
        return json(200, project({ is_published: true, version: 4 }))
      },
    })
    const user = renderList()
    const list = await screen.findByRole('list', { name: 'Проекты' })
    const row = within(list).getByRole('listitem')
    expect(within(row).getByText('Alatau City')).toBeTruthy()
    expect(within(row).getByText('Девелопмент')).toBeTruthy()
    expect(within(row).getByText('Строится')).toBeTruthy()

    const toggle = within(row).getByRole('switch', { name: /На сайте/ })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    await user.click(toggle)
    await waitFor(() => expect(bodies).toEqual([{ version: 3, is_published: true }]))
    expect(await screen.findByText('Запись показана на сайте')).toBeTruthy()
  })

  it('filters through the API and does not offer dragging while filtered', async () => {
    const { calls } = fakeFetch({
      ...lookup,
      'GET /api/v1/admin/projects': () => json(200, listOf([project()])),
    })
    const user = renderList()
    await screen.findByText('Alatau City')
    expect(screen.getByRole('button', { name: 'Перетащить: Alatau City' })).toBeTruthy()

    await user.selectOptions(screen.getByLabelText('Статус'), 'in_progress')
    await waitFor(() =>
      expect(calls.some((c) => c.includes('/projects?') && c.includes('status=in_progress'))).toBe(
        true,
      ),
    )
    expect(screen.queryByRole('button', { name: 'Перетащить: Alatau City' })).toBeNull()
    expect(screen.getByText(/сбросьте поиск, фильтры и сортировку/)).toBeTruthy()
  })

  it('explains a refused deletion with links to the places', async () => {
    fakeFetch({
      ...lookup,
      'GET /api/v1/admin/projects': () => json(200, listOf([project()])),
      'DELETE /api/v1/admin/projects/{id}': ({ url }) => {
        expect(url.searchParams.get('version')).toBe('3')
        return apiError(409, 'IN_USE', 'Проект: запись используется', [
          {
            entity_type: 'section',
            entity_id: 's1',
            field: 'data.project_ids',
            label: 'Страница «home», блок «Проекты»',
            page_id: 'p1',
          },
        ])
      },
    })
    const user = renderList()
    await user.click(
      await screen.findByRole('button', { name: 'Действия с записью «Alatau City»' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Удалить' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Удалить' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Не получилось удалить' })
    expect(within(dialog).getByText('Проект: запись используется')).toBeTruthy()
    expect(
      within(dialog)
        .getByRole('link', { name: /Страница «home», блок «Проекты»/ })
        .getAttribute('href'),
    ).toBe('/admin/pages/p1?block=s1')
  })
})

describe('collection record', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('saves a changed gallery by its own request only', async () => {
    const puts: unknown[] = []
    const { calls } = fakeFetch({
      ...lookup,
      'GET /api/v1/admin/projects/{id}': () => json(200, project()),
      'PUT /api/v1/admin/projects/{id}/gallery': ({ body }) => {
        puts.push(body)
        return json(200, project({ version: 4, gallery: project().gallery.slice(1) }))
      },
    })
    const user = renderItem('/admin/collections/projects/pr1')
    await user.click(await screen.findByRole('button', { name: 'Убрать «a.jpg»' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(puts).toEqual([{ version: 3, media_ids: ['m2'] }]))
    expect(calls.some((c) => c.startsWith('PATCH'))).toBe(false)
    expect(await screen.findByText('Изменения сохранены')).toBeTruthy()
  })

  it('keeps the gallery edit and shows its problem when only the record was saved', async () => {
    fakeFetch({
      ...lookup,
      'GET /api/v1/admin/projects/{id}': () => json(200, project()),
      'PATCH /api/v1/admin/projects/{id}': ({ body }) => {
        expect(body).toMatchObject({ version: 3, title: { ru: 'Alatau City 2' } })
        expect(body).not.toHaveProperty('gallery')
        return json(200, project({ version: 4, title: { ru: 'Alatau City 2' } }))
      },
      'PUT /api/v1/admin/projects/{id}/gallery': ({ body }) => {
        expect(body).toMatchObject({ version: 4 })
        return apiError(422, 'VALIDATION_ERROR', 'В галерею подходят только фото', [
          { loc: ['body', 'media_ids', 0], msg: 'сюда подходит: фото; выбран файл: видео' },
        ])
      },
    })
    const user = renderItem('/admin/collections/projects/pr1')
    const title = await screen.findByRole('textbox', { name: /^Название/ })
    await user.type(title, ' 2')
    await user.click(screen.getByRole('button', { name: 'Убрать «a.jpg»' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(
      await screen.findByText('Файл № 1: сюда подходит: фото; выбран файл: видео'),
    ).toBeTruthy()
    // The unsaved gallery change is still there.
    expect(screen.queryByRole('button', { name: 'Убрать «a.jpg»' })).toBeNull()
  })

  it('never overwrites a record someone else saved', async () => {
    fakeFetch({
      ...lookup,
      'GET /api/v1/admin/people/{id}': () => json(200, person()),
      'PATCH /api/v1/admin/people/{id}': () => apiError(409, 'VERSION_CONFLICT', 'Изменилась'),
    })
    const user = renderItem('/admin/collections/people/pe1')
    await user.type(await screen.findByRole('textbox', { name: /^Имя и фамилия/ }), '!')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(
      await screen.findByRole('alertdialog', { name: 'Запись изменили, пока вы её редактировали' }),
    ).toBeTruthy()
  })

  it('creates a record from the form and opens it', async () => {
    let posted: unknown
    fakeFetch({
      ...lookup,
      'POST /api/v1/admin/people': ({ body }) => {
        posted = body
        return json(201, person({ id: 'pe2', full_name: { ru: 'Новый Человек' } }))
      },
      'GET /api/v1/admin/people/{id}': () =>
        json(200, person({ id: 'pe2', full_name: { ru: 'Новый Человек' } })),
    })
    const user = renderItem('/admin/collections/people/new')
    expect(await screen.findByRole('heading', { name: 'Новый сотрудник' })).toBeTruthy()
    await user.type(screen.getByRole('textbox', { name: /^Имя и фамилия/ }), 'Новый Человек')
    await user.click(screen.getByRole('button', { name: 'Создать' }))
    expect(await screen.findByRole('heading', { name: 'Новый Человек' })).toBeTruthy()
    expect(posted).toMatchObject({
      full_name: { ru: 'Новый Человек' },
      is_published: false,
      is_key: false,
    })
  })
})
