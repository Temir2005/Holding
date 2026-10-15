import { focusManager } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiError, fakeFetch, json, signedIn } from '../../test/fakeApi'
import { withProviders } from '../../test/renderForm'
import { PageEditorPage } from './PageEditorPage'
import { pageDetail, section } from './testData'
import type { PageDetail } from '../../api/pages'

function renderEditor() {
  const user = userEvent.setup()
  render(withProviders(<PageEditorPage />, '/admin/pages/p1', '/admin/pages/:pageId'))
  return user
}

const DRAFT_HASH = 'a'.repeat(64)

describe('publishing', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('is off when the page on the site is up to date', async () => {
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () =>
        json(200, pageDetail({ is_published: true, has_unpublished_changes: false })),
    })
    renderEditor()
    expect(await screen.findByRole('button', { name: 'Опубликовать' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByText('На сайте')).toBeTruthy()
  })

  it('sends the version and draft hash it showed, with a comment', async () => {
    const bodies: unknown[] = []
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()),
      'POST /api/v1/admin/pages/{id}/publish': ({ body }) => {
        bodies.push(body)
        return json(200, { ...pageDetail({ has_unpublished_changes: false }), sections: undefined })
      },
      'GET /api/v1/admin/pages': () => json(200, { items: [], total: 0, page: 1, page_size: 100 }),
      'GET /api/v1/admin/pages/{id}/revisions': () => json(200, []),
    })
    const user = renderEditor()
    await user.click(await screen.findByRole('button', { name: 'Опубликовать' }))
    const dialog = await screen.findByRole('dialog', { name: 'Опубликовать страницу' })
    await user.type(within(dialog).getByLabelText('Что изменилось'), 'Новый текст')
    await user.click(within(dialog).getByRole('button', { name: 'Опубликовать' }))
    await waitFor(() =>
      expect(bodies).toEqual([{ version: 4, draft_hash: DRAFT_HASH, comment: 'Новый текст' }]),
    )
  })

  it('lists problems and opens the block with the field marked', async () => {
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()),
      'POST /api/v1/admin/pages/{id}/publish': () =>
        apiError(422, 'VALIDATION_ERROR', 'Проверьте блоки', [
          { loc: ['sections', 0, 'data', 'text', 'ru'], msg: 'Слишком коротко', section_id: 's1' },
        ]),
    })
    const user = renderEditor()
    await user.click(await screen.findByRole('button', { name: 'Опубликовать' }))
    const dialog = await screen.findByRole('dialog', { name: 'Опубликовать страницу' })
    await user.click(within(dialog).getByRole('button', { name: 'Опубликовать' }))
    expect(await within(dialog).findByText('Слишком коротко')).toBeTruthy()

    await user.click(within(dialog).getByRole('button', { name: 'Перейти к полю' }))
    const editor = await screen.findByRole('dialog', { name: /Цитата/ })
    expect(await within(editor).findByText('Слишком коротко')).toBeTruthy()
    expect(
      within(editor).getByRole('textbox', { name: 'Цитата' }).getAttribute('aria-invalid'),
    ).toBe('true')
  })

  it('asks to reload when someone changed the draft meanwhile', async () => {
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()),
      'POST /api/v1/admin/pages/{id}/publish': () =>
        apiError(409, 'DRAFT_CHANGED', 'Черновик изменился'),
    })
    const user = renderEditor()
    await user.click(await screen.findByRole('button', { name: 'Опубликовать' }))
    const dialog = await screen.findByRole('dialog', { name: 'Опубликовать страницу' })
    await user.click(within(dialog).getByRole('button', { name: 'Опубликовать' }))
    expect(await within(dialog).findByText(/Страницу изменили, пока вы её смотрели/)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Обновить' })).toBeTruthy()
  })
})

describe('blocks', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('never overwrites a block someone else saved', async () => {
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()),
      'PATCH /api/v1/admin/sections/{id}': ({ body }) => {
        expect(body).toMatchObject({ version: 1, data: { text: { ru: 'Делаем на совесть!' } } })
        return apiError(409, 'VERSION_CONFLICT', 'Запись изменилась')
      },
    })
    const user = renderEditor()
    await user.click(await screen.findByRole('button', { name: /^1\s*Цитата/ }))
    const editor = await screen.findByRole('dialog', { name: /Цитата/ })
    await user.type(within(editor).getByRole('textbox', { name: 'Цитата' }), '!')
    await user.click(within(editor).getByRole('button', { name: 'Сохранить' }))
    expect(
      await screen.findByRole('alertdialog', { name: 'Запись изменили, пока вы её редактировали' }),
    ).toBeTruthy()
  })

  it('adds a block of the chosen type at the chosen place', async () => {
    let posted: unknown
    const page: PageDetail = pageDetail({ sections: [section({ id: 'a' }), section({ id: 'b' })] })
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, page),
      'POST /api/v1/admin/pages/{id}/sections': ({ body }) => {
        posted = body
        return json(201, section({ id: 'new' }))
      },
      'GET /api/v1/admin/pages': () => json(200, { items: [], total: 0, page: 1, page_size: 100 }),
    })
    const user = renderEditor()
    const first = await screen.findAllByRole('button', { name: /Действия с блоком/ })
    await user.click(first[0] as HTMLElement)
    await user.click(await screen.findByRole('menuitem', { name: 'Добавить блок ниже' }))
    const chooser = await screen.findByRole('dialog', { name: 'Какой блок добавить?' })
    await user.click(within(chooser).getByRole('button', { name: /^Цитата/ }))

    const editor = await screen.findByRole('dialog', { name: 'Новый блок: Цитата' })
    await user.type(within(editor).getByRole('textbox', { name: 'Цитата' }), 'Новая цитата')
    await user.click(within(editor).getByRole('button', { name: 'Сохранить' }))
    await waitFor(() =>
      expect(posted).toMatchObject({
        type: 'quote',
        position: 1,
        tone: 'dark',
        is_visible: true,
        data: { text: { ru: 'Новая цитата' } },
      }),
    )
  })

  it('picks a page for a button link from the list', async () => {
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () =>
        json(
          200,
          pageDetail({
            sections: [
              section({
                id: 'c',
                type: 'cta',
                label: 'Призыв',
                data: { ctas: [{ label: { ru: 'Связаться' }, href: '', variant: 'primary' }] },
              }),
            ],
          }),
        ),
      'GET /api/v1/admin/lookup': () =>
        json(200, [
          {
            id: 'pg',
            kind: 'page',
            title: 'Контакты',
            subtitle: 'contacts',
            slug: 'contacts',
            is_published: true,
          },
        ]),
    })
    const user = renderEditor()
    await user.click(await screen.findByRole('button', { name: /Связаться|Без заголовка/ }))
    const editor = await screen.findByRole('dialog', { name: /Призыв к действию/ })
    await user.click(within(editor).getByRole('button', { name: 'Выбрать страницу' }))
    const picker = await screen.findByRole('dialog', { name: 'Выбрать страницу' })
    await user.click(await within(picker).findByRole('button', { name: 'Выбрать «Контакты»' }))
    expect(within(editor).getByRole('textbox', { name: 'Ссылка: Страница' })).toHaveProperty(
      'value',
      'contacts',
    )
  })
})

describe('deleting a page', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  const openDelete = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: 'Ещё действия' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Удалить страницу' }))
    return screen.findByRole('alertdialog', { name: 'Удалить страницу «О нас»?' })
  }

  it('warns that the history goes too, then deletes with the version', async () => {
    let version: string | null = null
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()),
      'DELETE /api/v1/admin/pages/{id}': ({ url }) => {
        version = url.searchParams.get('version')
        return new Response(null, { status: 204 })
      },
      'GET /api/v1/admin/pages': () => json(200, { items: [], total: 0, page: 1, page_size: 100 }),
    })
    const user = renderEditor()
    const confirm = await openDelete(user)
    expect(within(confirm).getByText(/вся история версий удалятся безвозвратно/)).toBeTruthy()
    await user.click(within(confirm).getByRole('button', { name: 'Удалить страницу' }))
    expect(await screen.findByText('elsewhere')).toBeTruthy()
    expect(version).toBe('4')
  })

  it('lists the places that link to the page when it cannot be deleted', async () => {
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()),
      'DELETE /api/v1/admin/pages/{id}': () =>
        apiError(409, 'IN_USE', 'На страницу ссылаются меню, кнопки или направления', [
          {
            entity_type: 'section',
            entity_id: 's9',
            field: 'data.ctas.0.href',
            label: 'Страница «home», блок «Призыв к действию»',
            page_id: 'p0',
          },
          { entity_type: 'site_settings', entity_id: 'x', field: 'navigation', label: 'Меню' },
        ]),
    })
    const user = renderEditor()
    await user.click(
      within(await openDelete(user)).getByRole('button', { name: 'Удалить страницу' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Страницу нельзя удалить' })
    expect(
      within(dialog).getByText('На страницу ссылаются меню, кнопки или направления'),
    ).toBeTruthy()
    expect(
      within(dialog)
        .getByRole('link', { name: /блок «Призыв к действию»/ })
        .getAttribute('href'),
    ).toBe('/admin/pages/p0?block=s9')
    expect(within(dialog).getByRole('link', { name: /Меню/ }).getAttribute('href')).toBe(
      '/admin/settings',
    )
  })

  it('is not offered for the home page', async () => {
    fakeFetch({ 'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail({ slug: 'home' })) })
    const user = renderEditor()
    await user.click(await screen.findByRole('button', { name: 'Ещё действия' }))
    expect(await screen.findByRole('menuitem', { name: 'История версий' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Удалить страницу' })).toBeNull()
  })
})

describe('a link to a block', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('opens that block in the editor', async () => {
    fakeFetch({ 'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()) })
    render(withProviders(<PageEditorPage />, '/admin/pages/p1?block=s1', '/admin/pages/:pageId'))
    const editor = await screen.findByRole('dialog', { name: /Цитата/ })
    expect(within(editor).getByRole('textbox', { name: 'Цитата' })).toBeTruthy()
  })
})

describe('page settings', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  /** The page as the server has it now; `refetch()` makes the editor load it again. */
  function serverPage() {
    const state = { page: pageDetail() }
    const refetch = () =>
      act(async () => {
        focusManager.setFocused(false)
        focusManager.setFocused(true)
      })
    return { state, refetch }
  }

  async function openSettings(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('tab', { name: 'Настройки и SEO' }))
    return screen.findByRole('textbox', { name: /^Название/ })
  }

  it('keep unsaved edits when someone saves the page meanwhile', async () => {
    const { state, refetch } = serverPage()
    const patches: unknown[] = []
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, state.page),
      'PATCH /api/v1/admin/pages/{id}': ({ body }) => {
        patches.push(body)
        return apiError(409, 'VERSION_CONFLICT', 'Запись изменилась')
      },
    })
    const user = renderEditor()
    const title = await openSettings(user)
    await user.type(title, '!')

    state.page = pageDetail({ version: 5, title: { ru: 'О компании' } })
    await refetch()
    expect(await screen.findByRole('heading', { level: 1, name: 'О компании' })).toBeTruthy()
    expect(title).toHaveProperty('value', 'О нас!')

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(patches).toMatchObject([{ version: 4, title: { ru: 'О нас!' } }]))
    expect(
      await screen.findByRole('alertdialog', { name: 'Запись изменили, пока вы её редактировали' }),
    ).toBeTruthy()
  })

  it('show a newer version at once when there are no edits', async () => {
    const { state, refetch } = serverPage()
    fakeFetch({ 'GET /api/v1/admin/pages/{id}': () => json(200, state.page) })
    const user = renderEditor()
    await openSettings(user)

    state.page = pageDetail({ version: 5, title: { ru: 'О компании' } })
    await refetch()
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^Название/ })).toHaveProperty(
        'value',
        'О компании',
      ),
    )
  })

  it('save with the version the form shows, then continue from the saved one', async () => {
    const versions: unknown[] = []
    fakeFetch({
      'GET /api/v1/admin/pages/{id}': () => json(200, pageDetail()),
      'PATCH /api/v1/admin/pages/{id}': ({ body }) => {
        const { version, ...rest } = body as { version: number }
        versions.push(version)
        return json(200, { ...pageDetail(), ...rest, version: version + 1 })
      },
      'GET /api/v1/admin/pages': () => json(200, { items: [], total: 0, page: 1, page_size: 100 }),
    })
    const user = renderEditor()
    const title = await openSettings(user)
    await user.type(title, '!')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Настройки страницы сохранены')).toBeTruthy()
    await user.type(title, '?')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(versions).toEqual([4, 5]))
  })
})
