/** Collection records for tests, shaped like `GET /admin/<collection>/{id}`. */
import type { PersonItem, ProjectItem } from '../../api/collections'
import type { RefCard } from '../../api/queries'

const common = {
  is_published: false,
  sort_order: 0,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-10T10:00:00Z',
}

export const mediaCard = (id: string, title: string): RefCard => ({
  id,
  kind: 'media',
  title,
  subtitle: 'JPEG · 1200×800',
  thumb_url: `http://storage/${id}.jpg`,
  is_published: null,
  slug: null,
})

export function project(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    ...common,
    id: 'pr1',
    version: 3,
    slug: 'alatau',
    title: { ru: 'Alatau City' },
    division_id: 'd1',
    division: {
      id: 'd1',
      kind: 'division',
      title: 'Девелопмент',
      subtitle: null,
      thumb_url: null,
      is_published: true,
      slug: 'development',
    },
    status: 'in_progress',
    location: {},
    year: 2026,
    area_m2: null,
    short_description: { ru: 'Жилой квартал' },
    body: {},
    cover_id: null,
    cover: null,
    gallery: [mediaCard('m1', 'a.jpg'), mediaCard('m2', 'b.jpg')],
    tags: [],
    is_featured: false,
    is_tokenized: false,
    ...overrides,
  }
}

export function person(overrides: Partial<PersonItem> = {}): PersonItem {
  return {
    ...common,
    id: 'pe1',
    version: 1,
    full_name: { ru: 'Имя Фамилия' },
    position: {},
    division_id: null,
    division: null,
    bio: {},
    photo_id: null,
    photo: null,
    linkedin_url: null,
    is_key: false,
    is_founder: false,
    ...overrides,
  }
}

export const listOf = <T>(items: T[]) => ({ items, total: items.length, page: 1, page_size: 100 })
