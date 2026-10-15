import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SiteSettings } from '../../api/settings'
import { fieldKind, itemNode, resolveNode } from '../../forms/schema/resolve'
import type { ResolvedNode } from '../../forms/schema/types'
import { apiError, fakeFetch, json, signedIn } from '../../test/fakeApi'
import { entitySchema, withProviders } from '../../test/renderForm'
import { SettingsPage } from './SettingsPage'

function siteSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    id: 'st',
    site_name: { ru: 'MegaSmart' },
    logo_id: null,
    navigation: [{ label: { ru: 'О нас' }, page_slug: 'about', anchor: null, url: null }],
    contacts: {
      address: { ru: 'Шымкент' },
      phones: ['+7 700 000 00 00'],
      email: 'info@example.com',
      whatsapp: null,
      hours: null,
      coordinates: null,
    },
    socials: [],
    footer: { text: { ru: 'Холдинг' }, legal: { ru: '© MegaSmart' } },
    default_seo: { title: { ru: 'MegaSmart' }, description: { ru: 'Описание' }, og_image_id: null },
    refs: {},
    updated_at: '2026-10-10T10:00:00Z',
    version: 2,
    ...overrides,
  }
}

function renderSettings() {
  const user = userEvent.setup()
  render(withProviders(<SettingsPage />, '/admin/settings'))
  return user
}

describe('site settings form', () => {
  it('is built from the backend schema without JSON fallbacks', () => {
    const root = entitySchema('site_settings')
    const fallbacks: string[] = []
    const walk = (node: ResolvedNode, path: string) => {
      const kind = fieldKind(node, root)
      if (kind === 'json') fallbacks.push(path)
      if (kind === 'object') {
        for (const [key, child] of Object.entries(node.schema.properties ?? {})) {
          walk(resolveNode(child, root), `${path}.${key}`)
        }
      }
      if (kind === 'array') walk(itemNode(node.schema, root), `${path}[]`)
    }
    walk({ schema: root, nullable: false }, 'settings')
    expect(fallbacks).toEqual([])
  })
})

describe('site settings page', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    signedIn()
  })

  it('saves the whole document with the version it showed', async () => {
    const bodies: unknown[] = []
    fakeFetch({
      'GET /api/v1/admin/settings': () => json(200, siteSettings()),
      'PUT /api/v1/admin/settings': ({ body }) => {
        bodies.push(body)
        return json(200, siteSettings({ site_name: { ru: 'MegaSmart Holding' }, version: 3 }))
      },
    })
    const user = renderSettings()
    const name = await screen.findByRole('textbox', { name: /^Название сайта/ })
    await user.type(name, ' Holding')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({
      version: 2,
      site_name: { ru: 'MegaSmart Holding' },
      navigation: [{ label: { ru: 'О нас' }, page_slug: 'about' }],
      contacts: { phones: ['+7 700 000 00 00'] },
      footer: { legal: { ru: '© MegaSmart' } },
    })
    expect(await screen.findByText('Настройки сайта сохранены')).toBeTruthy()
  })

  it('shows a menu problem next to the menu item field', async () => {
    fakeFetch({
      'GET /api/v1/admin/settings': () => json(200, siteSettings()),
      'PUT /api/v1/admin/settings': () =>
        apiError(422, 'VALIDATION_ERROR', 'Проверьте меню', [
          { loc: ['body', 'navigation', 0, 'page_slug'], msg: 'нет страницы «about»' },
        ]),
    })
    const user = renderSettings()
    await user.type(await screen.findByRole('textbox', { name: /^Название сайта/ }), '!')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('нет страницы «about»')).toBeTruthy()
  })

  it('never overwrites settings someone else saved', async () => {
    fakeFetch({
      'GET /api/v1/admin/settings': () => json(200, siteSettings()),
      'PUT /api/v1/admin/settings': () => apiError(409, 'VERSION_CONFLICT', 'Изменились'),
    })
    const user = renderSettings()
    await user.type(await screen.findByRole('textbox', { name: /^Название сайта/ }), '!')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Запись изменили, пока вы её редактировали',
    })
    expect(within(dialog).getByRole('button', { name: 'Загрузить свежую версию' })).toBeTruthy()
  })
})
