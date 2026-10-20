import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiError, fakeFetch, fakeXhr, json, mediaItem, page, signedIn } from '../../test/fakeApi'
import { renderForm, schemaOf, withProviders } from '../../test/renderForm'
import { emptyForm } from '../../forms/schema/values'
import { MediaLibraryPage } from './MediaLibraryPage'

const ticket = (id: string) => ({
  media: mediaItem({ id, status: 'pending' }),
  upload: {
    url: `http://storage/${id}.jpg?sig=1`,
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    expires_in: 900,
  },
})

const jpeg = (name = 'facade.jpg', size = 2048) =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' })

function renderLibrary(path = '/admin/media') {
  const user = userEvent.setup()
  render(withProviders(<MediaLibraryPage />, path))
  return user
}

describe('media library', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('uploads dropped or chosen files in three steps and shows server warnings', async () => {
    fakeXhr()
    let uploaded = false
    const { calls } = fakeFetch({
      'GET /api/v1/admin/media': () => json(200, page(uploaded ? [mediaItem({ id: 'new' })] : [])),
      'GET /api/v1/admin/media/folders': () => json(200, []),
      'POST /api/v1/admin/media/upload-url': () => json(201, ticket('new')),
      'POST /api/v1/admin/media/{id}/complete': () => {
        uploaded = true
        return json(200, { media: mediaItem({ id: 'new' }), warnings: ['Видео без faststart'] })
      },
    })
    const user = renderLibrary()
    expect(await screen.findByText('Файлов пока нет — загрузите первый')).toBeTruthy()

    await user.upload(screen.getByTestId('media-file-input'), jpeg())
    expect(await screen.findByText('Готово')).toBeTruthy()
    expect(screen.getByText('Видео без faststart')).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Открыть файл facade.jpg' })).toBeTruthy()
    expect(calls).toContain('POST /api/v1/admin/media/new/complete')
  })

  it('refuses a too large file before sending anything', async () => {
    fakeXhr()
    const { calls } = fakeFetch({
      'GET /api/v1/admin/media': () => json(200, page([])),
      'GET /api/v1/admin/media/folders': () => json(200, []),
    })
    const user = renderLibrary()
    await user.upload(screen.getByTestId('media-file-input'), jpeg('huge.jpg', 21 * 1024 * 1024))
    expect(await screen.findByText('Файл больше 20 МБ')).toBeTruthy()
    expect(calls.some((c) => c.includes('upload-url'))).toBe(false)
  })

  it('shows a server error of the last step and lets the user retry', async () => {
    fakeXhr()
    let attempts = 0
    fakeFetch({
      'GET /api/v1/admin/media': () => json(200, page([])),
      'GET /api/v1/admin/media/folders': () => json(200, []),
      'POST /api/v1/admin/media/upload-url': () => json(201, ticket('bad')),
      'POST /api/v1/admin/media/{id}/complete': () => {
        attempts += 1
        return attempts === 1
          ? apiError(422, 'MEDIA_TYPE_MISMATCH', 'Файл не того типа, что заявлен')
          : json(200, { media: mediaItem({ id: 'bad' }), warnings: [] })
      },
    })
    const user = renderLibrary()
    await user.upload(screen.getByTestId('media-file-input'), jpeg())
    expect(await screen.findByText('Файл не того типа, что заявлен')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Готово')).toBeTruthy()
  })
})

describe('media card', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('saves the caption with the version and handles a version conflict without overwriting', async () => {
    let version = 1
    const patches: unknown[] = []
    fakeFetch({
      'GET /api/v1/admin/media': () => json(200, page([mediaItem()])),
      'GET /api/v1/admin/media/folders': () => json(200, [{ folder: 'projects', count: 1 }]),
      'GET /api/v1/admin/media/{id}': () =>
        json(200, mediaItem({ version, alt: { ru: version > 1 ? 'Свежая' : 'Фасад' } })),
      'GET /api/v1/admin/media/{id}/usages': () => json(200, []),
      'PATCH /api/v1/admin/media/{id}': ({ body }) => {
        patches.push(body)
        version = 2
        return apiError(409, 'VERSION_CONFLICT', 'Запись изменилась', {
          expected_version: 1,
          current_version: 2,
        })
      },
    })
    const user = renderLibrary('/admin/media?file=m1')
    const caption = await screen.findByRole('textbox', { name: 'Подпись (alt)' })
    await user.clear(caption)
    await user.type(caption, 'Фасад зимой')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Запись изменили, пока вы её редактировали',
    })
    expect(patches[0]).toMatchObject({ version: 1, alt: { ru: 'Фасад зимой' } })
    await user.click(within(dialog).getByRole('button', { name: 'Загрузить свежую версию' }))
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Подпись (alt)' })).toHaveProperty(
        'value',
        'Свежая',
      ),
    )
  })

  it('shows the saved focal point and keeps it when another field is saved', async () => {
    const patches: unknown[] = []
    const stored = mediaItem({ focal_point_x: 0.25, focal_point_y: 0.75 })
    fakeFetch({
      'GET /api/v1/admin/media': () => json(200, page([stored])),
      'GET /api/v1/admin/media/folders': () => json(200, [{ folder: 'projects', count: 1 }]),
      'GET /api/v1/admin/media/{id}': () => json(200, stored),
      'GET /api/v1/admin/media/{id}/usages': () => json(200, []),
      'PATCH /api/v1/admin/media/{id}': ({ body }) => {
        patches.push(body)
        return json(200, { ...stored, alt: { ru: 'Фасад зимой' }, version: 2 })
      },
    })
    const user = renderLibrary('/admin/media?file=m1')
    const x = await screen.findByRole('spinbutton', { name: 'Фокус по горизонтали (0–1)' })
    expect(x).toHaveProperty('value', '0.25')
    expect(screen.getByRole('spinbutton', { name: 'Фокус по вертикали (0–1)' })).toHaveProperty(
      'value',
      '0.75',
    )

    const caption = screen.getByRole('textbox', { name: 'Подпись (alt)' })
    await user.clear(caption)
    await user.type(caption, 'Фасад зимой')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(patches).toHaveLength(1))
    expect(patches[0]).toMatchObject({
      version: 1,
      alt: { ru: 'Фасад зимой' },
      focal_point_x: 0.25,
      focal_point_y: 0.75,
    })
  })

  it('lists the places that use a file when deletion is refused', async () => {
    fakeFetch({
      'GET /api/v1/admin/media': () => json(200, page([mediaItem()])),
      'GET /api/v1/admin/media/folders': () => json(200, []),
      'GET /api/v1/admin/media/{id}': () => json(200, mediaItem()),
      'GET /api/v1/admin/media/{id}/usages': () => json(200, []),
      'DELETE /api/v1/admin/media/{id}': () =>
        apiError(409, 'IN_USE', 'Файл используется', [
          { entity_type: 'project', entity_id: 'p1', field: 'cover_id', label: 'Проект «Alatau»' },
          {
            entity_type: 'section',
            entity_id: 's1',
            field: 'data',
            label: 'Страница «about», блок «Галерея»',
          },
        ]),
    })
    const user = renderLibrary('/admin/media?file=m1')
    await user.click(await screen.findByRole('button', { name: 'Удалить файл' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Удалить файл?' })
    await user.click(within(confirm).getByRole('button', { name: 'Удалить файл' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Нельзя удалить: объект используется',
    })
    expect(
      within(dialog)
        .getByRole('link', { name: /Проект «Alatau»/ })
        .getAttribute('href'),
    ).toBe('/admin/collections/projects/p1')
    expect(within(dialog).getByText('Страница «about», блок «Галерея»')).toBeTruthy()
  })
})

describe('media fields in block forms', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('picks one file, filtered by what the field accepts', async () => {
    const { calls } = fakeFetch({
      'GET /api/v1/admin/media': () => json(200, page([mediaItem()])),
      'GET /api/v1/admin/media/folders': () => json(200, []),
      'GET /api/v1/admin/lookup': () =>
        json(200, [
          { id: 'm1', kind: 'media', title: 'facade.jpg', subtitle: '1200×800', thumb_url: null },
        ]),
    })
    const schema = schemaOf('video')
    const { user, getForm } = renderForm(schema, emptyForm(schema))
    const posterChoose = screen.getAllByRole('button', { name: 'Выбрать файл' })[1] as HTMLElement
    await user.click(posterChoose)
    const dialog = await screen.findByRole('dialog', { name: 'Выбор файла' })
    await user.click(await within(dialog).findByRole('button', { name: 'Выбрать «facade.jpg»' }))
    expect(getForm().getValues('poster_media_id')).toBe('m1')
    expect(await screen.findByText('facade.jpg')).toBeTruthy()
    expect(calls.find((c) => c.startsWith('GET /api/v1/admin/media?'))).toContain('kind=image')
  })

  it('keeps an ordered list for galleries and removes items', async () => {
    fakeFetch({
      'GET /api/v1/admin/media': () =>
        json(200, page([mediaItem(), mediaItem({ id: 'm2', original_filename: 'yard.jpg' })])),
      'GET /api/v1/admin/media/folders': () => json(200, []),
      'GET /api/v1/admin/lookup': ({ url }) =>
        json(
          200,
          url.searchParams
            .getAll('ids')
            .map((id) => ({ id, kind: 'media', title: `${id}.jpg`, thumb_url: null })),
        ),
    })
    const schema = schemaOf('media_gallery')
    const { user, getForm } = renderForm(schema, emptyForm(schema))
    await user.click(screen.getByRole('button', { name: 'Добавить файлы' }))
    const dialog = await screen.findByRole('dialog', { name: 'Выбор файлов' })
    await user.click(await within(dialog).findByRole('button', { name: 'Выбрать «yard.jpg»' }))
    await user.click(within(dialog).getByRole('button', { name: 'Выбрать «facade.jpg»' }))
    await user.click(within(dialog).getByRole('button', { name: 'Выбрать (2)' }))
    expect(getForm().getValues('media_ids')).toEqual(['m2', 'm1'])

    await user.click(screen.getByRole('button', { name: 'Убрать «yard.jpg»' }))
    expect(getForm().getValues('media_ids')).toEqual(['m1'])
  })
})
