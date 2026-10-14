/** Page and section records for tests, shaped like `GET /admin/pages/{id}`. */
import type { PageDetail, SectionRead } from '../../api/pages'

export function section(overrides: Partial<SectionRead> = {}): SectionRead {
  return {
    id: 's1',
    page_id: 'p1',
    type: 'quote',
    label: 'Цитата',
    sort_order: 10,
    is_visible: true,
    anchor: null,
    tone: 'dark',
    data: {
      text: { ru: 'Делаем на совесть' },
      eyebrow: null,
      title: null,
      person_id: null,
      media_id: null,
    },
    refs: {},
    updated_at: '2026-10-10T10:00:00Z',
    version: 1,
    ...overrides,
  }
}

export function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    id: 'p1',
    slug: 'about',
    title: { ru: 'О нас' },
    seo_title: {},
    seo_description: {},
    og_image_id: null,
    og_image: null,
    is_published: true,
    published_revision_number: 2,
    published_at: '2026-10-10T10:00:00Z',
    has_unpublished_changes: true,
    sort_order: 10,
    sections_count: 1,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-10T10:00:00Z',
    version: 4,
    sections: [section()],
    draft_hash: 'a'.repeat(64),
    ...overrides,
  }
}
