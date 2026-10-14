import { act, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fakeFetch, json, signedIn } from '../../test/fakeApi'
import { entitySchema, renderForm, schemaOf } from '../../test/renderForm'
import { applyServerErrors } from './errors'
import type { JsonSchema } from './types'
import { emptyForm } from './values'

describe('localized fields', () => {
  it('switches every text of the form with one language switch', async () => {
    const schema = schemaOf('hero')
    const { user } = renderForm(schema, {
      ...emptyForm(schema),
      title: { ru: 'Строим', kk: 'Саламыз' },
      subtitle: { ru: 'Подзаголовок' },
    })
    expect(screen.getByLabelText('Заголовок')).toHaveProperty('value', 'Строим')

    const switcher = screen.getByRole('group', { name: 'Язык текстов' })
    await user.click(within(switcher).getByRole('button', { name: 'KZ' }))
    expect(screen.getByLabelText('Заголовок')).toHaveProperty('value', 'Саламыз')
    expect(screen.getByLabelText('Заголовок').getAttribute('lang')).toBe('kk')
  })

  it('shows the Russian text as a fallback hint for an empty translation', async () => {
    const schema = schemaOf('hero')
    const { user } = renderForm(schema, { ...emptyForm(schema), title: { ru: 'Строим' } })
    await user.click(screen.getByRole('button', { name: 'EN' }))
    const input = screen.getByLabelText('Заголовок')
    expect(input).toHaveProperty('value', '')
    expect(input.getAttribute('placeholder')).toBe('Строим')
    expect(
      screen.getAllByText('Пусто — на сайте будет показан русский текст').length,
    ).toBeGreaterThan(0)
  })

  it('marks which languages are filled, and switches language from a field', async () => {
    const schema = schemaOf('hero')
    const { user } = renderForm(schema, {
      ...emptyForm(schema),
      title: { ru: 'Строим', en: 'Build' },
    })
    expect(screen.getAllByRole('button', { name: /^RU: заполнено/ }).length).toBeGreaterThan(0)
    const kzEmpty = screen.getAllByRole('button', { name: /^KZ: пусто/ })[0]
    if (!kzEmpty) throw new Error('no KZ dot')
    await user.click(kzEmpty)
    const switcher = screen.getByRole('group', { name: 'Язык текстов' })
    expect(within(switcher).getByRole('button', { name: 'KZ' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('highlights an empty required Russian text and blocks submit', async () => {
    const schema = schemaOf('contact_form')
    const { submit, onSubmit } = renderForm(schema)
    expect(screen.getAllByRole('button', { name: /RU: обязательно, пусто/ }).length).toBe(2)
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByText('Заполните русский текст')).toHaveLength(2)
    expect(screen.getByText('Исправьте отмеченные поля')).toBeTruthy()
  })

  it('submits values in the stored shape', async () => {
    const schema = schemaOf('quote')
    const { user, submit, onSubmit } = renderForm(schema)
    await user.type(screen.getByRole('textbox', { name: 'Цитата' }), 'Делаем на совесть')
    await submit()
    expect(onSubmit).toHaveBeenCalledOnce()
    const stored = onSubmit.mock.calls[0]?.[0]
    expect(stored?.text).toEqual({ ru: 'Делаем на совесть' })
    expect(stored?.eyebrow).toBeNull()
  })
})

describe('markdown', () => {
  it('formats with the toolbar and previews with the site renderer', async () => {
    const schema = schemaOf('about_text')
    const { user } = renderForm(schema)
    const textarea = screen.getByRole('textbox', { name: 'Текст' }) as HTMLTextAreaElement
    await user.type(textarea, 'важно')
    textarea.setSelectionRange(0, 5)
    await user.click(screen.getByRole('button', { name: 'Жирный' }))
    expect(textarea.value).toBe('**важно**')

    await user.click(screen.getByRole('tab', { name: 'Предпросмотр' }))
    const strong = await screen.findByText('важно', { selector: 'strong' })
    expect(strong).toBeTruthy()
  })
})

describe('choices', () => {
  it('shows a few enum values as buttons with Russian labels', async () => {
    const schema = schemaOf('about_text')
    const { user, getForm } = renderForm(schema)
    await user.click(screen.getByRole('radio', { name: 'Картинка слева' }))
    expect(getForm().getValues('layout')).toBe('media_left')
  })

  it('keeps lead topics as checkboxes in schema order', async () => {
    const schema = schemaOf('contact_form')
    const { user, getForm } = renderForm(schema, { ...emptyForm(schema), lead_types: [] })
    await user.click(screen.getByRole('checkbox', { name: 'Заказ продукции' }))
    await user.click(screen.getByRole('checkbox', { name: 'Инвестиции' }))
    expect(getForm().getValues('lead_types')).toEqual(['investor', 'client'])
  })

  it('fills x-options dropdowns from meta and keeps unknown stored values', async () => {
    const schema = schemaOf('stats')
    const { user, getForm } = renderForm(schema, { ...emptyForm(schema), context: 'legacy' })
    const select = screen.getByLabelText('Набор цифр') as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toEqual(['', 'legacy', 'home', 'development'])
    await user.selectOptions(select, 'home')
    expect(getForm().getValues('context')).toBe('home')
    await user.selectOptions(select, '')
    expect(getForm().getValues('context')).toBeNull()
  })

  it('picks an icon from the searchable grid', async () => {
    const schema = schemaOf('capabilities')
    const values = {
      ...emptyForm(schema),
      items: [{ icon: 'factory', title: { ru: 'Завод' }, text: { ru: 'Свой' }, media_id: null }],
    }
    const { user, getForm } = renderForm(schema, values)
    await user.click(screen.getByRole('button', { name: 'Иконка: factory. Сменить иконку' }))
    const dialog = await screen.findByRole('dialog', { name: 'Выбор иконки' })
    await user.type(within(dialog).getByRole('searchbox'), 'lea')
    expect(
      within(dialog)
        .getAllByRole('button', { pressed: false })
        .map((b) => b.textContent),
    ).toEqual(['leaf'])
    await user.click(within(dialog).getByRole('button', { name: 'leaf' }))
    expect(getForm().getValues('items.0.icon')).toBe('leaf')
  })
})

describe('link, color, boolean', () => {
  it('edits a link by mode and stores the full target', async () => {
    const schema = schemaOf('hero')
    const values = {
      ...emptyForm(schema),
      ctas: [{ label: { ru: 'Проект' }, href: 'about', variant: 'primary' }],
    }
    const { user, getForm } = renderForm(schema, values)
    await user.click(screen.getByRole('radio', { name: 'Проект' }))
    const input = screen.getByRole('textbox', { name: 'Ссылка: Проект' })
    await user.clear(input)
    await user.type(input, 'alatau')
    expect(getForm().getValues('ctas.0.href')).toBe('projects/alatau')
    await user.click(screen.getByRole('radio', { name: 'Якорь' }))
    expect(getForm().getValues('ctas.0.href')).toBe('#alatau')
  })

  it('checks the color code', async () => {
    const schema = schemaOf('hero')
    const values = {
      ...emptyForm(schema),
      title: { ru: 'Т' },
      swatches: [
        { code: 'RAL 7016', label: { ru: 'Антрацит' }, color: '#383e42', finish: 'matte' },
      ],
    }
    const { user, submit, onSubmit } = renderForm(schema, values)
    const hex = screen.getByRole('textbox', { name: 'Цвет: Код цвета' })
    await user.clear(hex)
    await user.type(hex, '12345')
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Неверный формат')).toBeTruthy()
    await user.type(hex, '6')
    await submit()
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('toggles booleans with a switch', async () => {
    const schema = schemaOf('projects_showcase')
    const { user, getForm } = renderForm(schema)
    await user.click(screen.getByRole('switch', { name: 'Показывать избранные проекты' }))
    expect(getForm().getValues('featured')).toBe(true)
  })
})

describe('lists and objects', () => {
  it('adds, reorders and removes list items', async () => {
    const schema = schemaOf('process_steps')
    const { user, getForm } = renderForm(schema)
    await user.click(screen.getByRole('button', { name: 'Добавить: Этап' }))
    await user.type(screen.getByRole('textbox', { name: 'Название этапа' }), 'Проект')
    await user.click(screen.getByRole('button', { name: 'Добавить: Этап' }))
    const titles = screen.getAllByRole('textbox', { name: 'Название этапа' })
    await user.type(titles[1] as HTMLElement, 'Стройка')

    await user.click(screen.getAllByRole('button', { name: 'Поднять выше' })[1] as HTMLElement)
    expect(
      getForm()
        .getValues('steps')
        .map((s: { title: { ru: string } }) => s.title.ru),
    ).toEqual(['Стройка', 'Проект'])
    await user.click(screen.getAllByRole('button', { name: 'Удалить' })[0] as HTMLElement)
    expect(getForm().getValues('steps')).toHaveLength(1)
  })

  it('collapses a card and names it by its first text', async () => {
    const schema = schemaOf('process_steps')
    const values = {
      ...emptyForm(schema),
      steps: [{ title: { ru: 'Проект' }, text: { ru: 'x' }, media_id: null, division_id: null }],
    }
    const { user } = renderForm(schema, values)
    const toggle = screen.getByRole('button', { name: /Проект/, expanded: true })
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('textbox', { name: 'Название этапа' })).toBeNull()
  })

  it('adds and removes an optional nested object', async () => {
    const schema = schemaOf('projects_showcase')
    const { user, getForm } = renderForm(schema)
    await user.click(screen.getByRole('button', { name: 'Добавить: Ссылка «Все проекты»' }))
    expect(getForm().getValues('link')).toEqual({ label: { ru: '' }, href: '', variant: 'primary' })
    await user.click(screen.getByRole('button', { name: 'Убрать' }))
    expect(getForm().getValues('link')).toBeNull()
  })

  it('shows chosen people by their cards, adds from the picker and keeps the order', async () => {
    signedIn()
    const people = [
      { id: 'p1', kind: 'person', title: 'Основатель', subtitle: 'Директор', is_published: true },
      { id: 'p2', kind: 'person', title: 'Архитектор', subtitle: null, is_published: false },
      { id: 'p3', kind: 'person', title: 'Инженер', subtitle: null, is_published: true },
    ]
    fakeFetch({
      'GET /api/v1/admin/lookup': ({ url }) => {
        const ids = url.searchParams.getAll('ids')
        return json(200, ids.length ? people.filter((p) => ids.includes(p.id)) : people)
      },
    })
    const schema = schemaOf('team_grid')
    const { user, submit, onSubmit } = renderForm(schema, {
      ...emptyForm(schema),
      person_ids: ['p2', 'p1'],
    })
    const first = await screen.findByText('Архитектор')
    const list = first.closest('ul') as HTMLElement
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([expect.stringContaining('Архитектор'), expect.stringContaining('Основатель')])
    expect(within(list).getByText('Не на сайте')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Добавить' }))
    const dialog = await screen.findByRole('dialog', { name: 'Люди' })
    await user.click(await within(dialog).findByRole('button', { name: 'Выбрать «Инженер»' }))
    await user.click(within(dialog).getByRole('button', { name: 'Выбрать (1)' }))
    await submit()
    expect(onSubmit.mock.calls[0]?.[0].person_ids).toEqual(['p2', 'p1', 'p3'])
  })
})

describe('fallbacks', () => {
  it('edits unknown widgets as JSON and warns the developer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        future: { title: 'Новое поле', 'x-widget': 'map-picker', default: { lat: 1 } },
      },
    }
    const { user, getForm } = renderForm(schema)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('map-picker'))
    const area = screen.getByLabelText('Новое поле')
    await user.clear(area)
    await user.type(area, '{{"lat": 2')
    await user.tab()
    expect(screen.getByText('Некорректный JSON, значение не изменено')).toBeTruthy()
    expect(getForm().getValues('future')).toEqual({ lat: 1 })
    await user.type(area, '}')
    await user.tab()
    expect(getForm().getValues('future')).toEqual({ lat: 2 })
  })
})

describe('server errors (422)', () => {
  it('puts problems next to fields by loc, nested paths included', async () => {
    const schema = schemaOf('process_steps')
    const values = {
      ...emptyForm(schema),
      steps: [{ title: { ru: 'Проект' }, text: { ru: 'x' }, media_id: null, division_id: null }],
    }
    const { getForm } = renderForm(schema, values)
    let unmapped: string[] = []
    act(() => {
      unmapped = applyServerErrors(
        getForm(),
        schema,
        [
          { loc: ['body', 'data', 'steps', 0, 'title', 'ru'], msg: 'Слишком общее название' },
          { loc: ['body', 'data', 'steps', 0, 'division_id'], msg: 'Нет такого направления' },
          { loc: ['body', 'anchor'], msg: 'Якорь занят' },
        ],
        { strip: ['data'] },
      )
    })
    expect(await screen.findByText('Слишком общее название')).toBeTruthy()
    expect(screen.getByText('Нет такого направления')).toBeTruthy()
    expect(unmapped).toEqual(['Якорь занят'])
  })

  it('maps publish errors of one section by stripping its prefix', async () => {
    const schema = schemaOf('hero')
    const { getForm } = renderForm(schema, { ...emptyForm(schema), title: { ru: 'Т' } })
    act(() => {
      applyServerErrors(
        getForm(),
        schema,
        [{ loc: ['sections', 2, 'data', 'title', 'ru'], msg: 'Не заполнено', section_id: 's' }],
        { strip: ['sections', 2, 'data'] },
      )
    })
    expect(await screen.findByText('Не заполнено')).toBeTruthy()
  })

  it('shows problems without a field above the form', () => {
    renderForm(schemaOf('hero'), undefined, { formErrors: ['Якорь занят'] })
    expect(screen.getByRole('alert').textContent).toContain('Якорь занят')
  })
})

describe('media card form (entity schema)', () => {
  it('edits tags as chips: Enter adds, Backspace removes the last, × removes one', async () => {
    const schema = entitySchema('media')
    const { user, getForm } = renderForm(schema, {
      alt: null,
      original_filename: 'facade.jpg',
      folder: null,
      tags: ['фасад'],
    })
    const input = screen.getByRole('textbox', { name: 'Теги' })
    await user.type(input, 'зима{Enter}лето,')
    expect(getForm().getValues('tags')).toEqual(['фасад', 'зима', 'лето'])
    await user.type(input, '{Backspace}')
    expect(getForm().getValues('tags')).toEqual(['фасад', 'зима'])
    await user.click(screen.getByRole('button', { name: 'Убрать тег фасад' }))
    expect(getForm().getValues('tags')).toEqual(['зима'])
  })

  it('suggests existing folders and accepts a new one', async () => {
    const schema = entitySchema('media')
    const { user, getForm, container } = renderForm(schema, {
      alt: null,
      original_filename: 'facade.jpg',
      folder: null,
      tags: [],
    })
    const folder = screen.getByRole('combobox', { name: 'Папка' })
    const listId = folder.getAttribute('list')
    const options = container.querySelectorAll(`datalist[id="${listId}"] option`)
    expect([...options].map((o) => o.getAttribute('value'))).toEqual(['projects'])
    await user.type(folder, 'hero')
    expect(getForm().getValues('folder')).toBe('hero')
    await user.clear(folder)
    expect(getForm().getValues('folder')).toBeNull()
  })
})

describe('collection forms (entity schemas)', () => {
  it('picks a page by its address for a page field', async () => {
    vi.unstubAllGlobals()
    signedIn()
    fakeFetch({
      'GET /api/v1/admin/lookup': () =>
        json(200, [
          { id: 'pg', kind: 'page', title: 'Девелопмент', slug: 'development', is_published: true },
        ]),
    })
    const schema = entitySchema('division')
    const { user, getForm } = renderForm(schema)
    const field = screen.getByRole('textbox', { name: 'Страница направления' })
    await user.click(screen.getByRole('button', { name: 'Выбрать страницу' }))
    const picker = await screen.findByRole('dialog', { name: 'Выбрать страницу' })
    await user.click(await within(picker).findByRole('button', { name: 'Выбрать «Девелопмент»' }))
    expect(field).toHaveProperty('value', 'development')
    expect(getForm().getValues('page_slug')).toBe('development')
    await user.clear(field)
    expect(getForm().getValues('page_slug')).toBeNull()
  })

  it('suggests the client industries in use for the industry key', () => {
    renderForm(entitySchema('client'))
    const input = screen.getByRole('combobox', { name: /Ключ отрасли/ })
    const list = document.getElementById(input.getAttribute('list') ?? '')
    expect([...(list?.querySelectorAll('option') ?? [])].map((o) => o.value)).toEqual(['finance'])
  })
})
