/**
 * The seven collections, one declaration each: how a record is named, its columns, filters,
 * sort orders and whether it can be reordered by dragging. The list and the editor are the
 * same components for all of them; the form comes from `GET /admin/entity-types`.
 *
 * Labels are keys of the `admin` i18n namespace.
 */
import type { ReactNode } from 'react'
import { api } from '../../api/client'
import type {
  ClientItem,
  CollectionItem,
  DivisionItem,
  PersonItem,
  ProjectItem,
  StatItem,
  TimelineEventItem,
  VacancyItem,
} from '../../api/collections'
import { metaOptions, type LookupKind, type Meta, type RefCard } from '../../api/queries'
import { tAdmin } from '../../i18n'
import type { CollectionSlug } from '../../layout/nav'
import { Badge } from '../../ui/feedback'

export interface Column<T> {
  label: string
  render: (item: T, meta: Meta | undefined) => ReactNode
}

export type FilterDef = { name: string; label: string } & (
  | { type: 'lookup'; kind: LookupKind }
  | { type: 'meta'; list: string }
  | { type: 'boolean'; yes: string; no: string }
)

export interface SortDef {
  /** `sort` of the list endpoint; null is the order on the site. */
  value: string | null
  label: string
}

export interface CollectionConfig<T extends CollectionItem = CollectionItem> {
  slug: CollectionSlug
  /** Entity type: the form in `entity-types`, the name in usages and the audit log. */
  entity: string
  /** "Новый проект" */
  newLabel: string
  title: (item: T) => string
  subtitle?: (item: T) => string | null | undefined
  thumb?: (item: T) => RefCard | null | undefined
  columns: Column<T>[]
  filters: FilterDef[]
  sorts: SortDef[]
  /**
   * Drag to reorder (in the site order, without filters). `group`: records keep their place
   * among others of the same group (timeline by year, stats by set).
   */
  reorder: false | { group?: (item: T) => string; groupHint?: string }
  /** The record's own page on the site, if it has one. */
  siteHref?: (item: T) => string | null
  /** A form field saved by its own request after the record (the project gallery). */
  separate?: {
    field: string
    /** Name of the field in that request, for its errors (`media_ids.2` → `gallery.2`). */
    requestField: string
    value: (item: T) => unknown
    save: (item: T, value: unknown) => Promise<T>
  }
}

type LocalizedValue = { [key: string]: unknown } | null | undefined

export const ru = (value: LocalizedValue): string => (typeof value?.ru === 'string' ? value.ru : '')

const dash = (value: ReactNode) => value || '—'

const mono = (value: string) => <span className="font-mono text-xs">{value}</span>

const metaLabel = (meta: Meta | undefined, list: string, value: string) =>
  metaOptions(meta, list).find((o) => o.value === value)?.label ?? value

const divisionColumn = <T extends { division: RefCard | null }>(): Column<T> => ({
  label: 'collection.columns.division',
  render: (item) => dash(item.division?.title),
})

const ORDER: SortDef = { value: null, label: 'collection.sort.site' }

const PUBLISHED_ONLY = {
  name: 'is_published',
  label: 'collection.filters.published',
  type: 'boolean',
  yes: 'collection.filters.onSite',
  no: 'collection.filters.hidden',
} as const satisfies FilterDef

const DIVISION_FILTER = {
  name: 'division_id',
  label: 'collection.columns.division',
  type: 'lookup',
  kind: 'division',
} as const satisfies FilterDef

function define<T extends CollectionItem>(config: CollectionConfig<T>): CollectionConfig {
  // Each declaration is checked against its own record type; the pages see the common part.
  return config as unknown as CollectionConfig
}

export const COLLECTION_CONFIGS: Record<CollectionSlug, CollectionConfig> = {
  divisions: define<DivisionItem>({
    slug: 'divisions',
    entity: 'division',
    newLabel: 'collection.new.divisions',
    title: (d) => ru(d.name),
    subtitle: (d) => ru(d.tagline),
    thumb: (d) => d.logo ?? d.cover,
    columns: [{ label: 'collection.columns.key', render: (d) => mono(d.slug) }],
    filters: [PUBLISHED_ONLY],
    sorts: [ORDER, { value: 'slug', label: 'collection.sort.key' }],
    reorder: {},
  }),
  projects: define<ProjectItem>({
    slug: 'projects',
    entity: 'project',
    newLabel: 'collection.new.projects',
    title: (p) => ru(p.title),
    subtitle: (p) => ru(p.location),
    thumb: (p) => p.cover,
    columns: [
      divisionColumn(),
      {
        label: 'collection.columns.status',
        render: (p, meta) => <Badge>{metaLabel(meta, 'project_statuses', p.status)}</Badge>,
      },
      { label: 'collection.columns.year', render: (p) => dash(p.year) },
    ],
    filters: [
      PUBLISHED_ONLY,
      DIVISION_FILTER,
      {
        name: 'status',
        label: 'collection.columns.status',
        type: 'meta',
        list: 'project_statuses',
      },
      {
        name: 'is_featured',
        label: 'collection.filters.featured',
        type: 'boolean',
        yes: 'collection.filters.yes',
        no: 'collection.filters.no',
      },
    ],
    sorts: [
      ORDER,
      { value: '-year', label: 'collection.sort.yearDesc' },
      { value: 'year', label: 'collection.sort.yearAsc' },
      { value: '-updated_at', label: 'collection.sort.updated' },
    ],
    reorder: {},
    siteHref: (p) => (p.is_published ? `/ru/projects/${p.slug}` : null),
    separate: {
      field: 'gallery',
      requestField: 'media_ids',
      value: (p) => p.gallery.map((card) => card.id),
      save: (p, ids) =>
        api.put('/api/v1/admin/projects/{item_id}/gallery', {
          path: { item_id: p.id },
          body: { version: p.version, media_ids: ids as string[] },
        }),
    },
  }),
  people: define<PersonItem>({
    slug: 'people',
    entity: 'person',
    newLabel: 'collection.new.people',
    title: (p) => ru(p.full_name),
    subtitle: (p) => ru(p.position),
    thumb: (p) => p.photo,
    columns: [
      divisionColumn(),
      {
        label: 'collection.columns.marks',
        render: (p) =>
          p.is_key || p.is_founder ? (
            <span className="flex flex-wrap gap-1">
              {p.is_founder && <Badge tone="info">{tAdmin('collection.marks.founder')}</Badge>}
              {p.is_key && <Badge>{tAdmin('collection.marks.key')}</Badge>}
            </span>
          ) : (
            '—'
          ),
      },
    ],
    filters: [
      PUBLISHED_ONLY,
      DIVISION_FILTER,
      {
        name: 'is_key',
        label: 'collection.marks.key',
        type: 'boolean',
        yes: 'collection.filters.yes',
        no: 'collection.filters.no',
      },
    ],
    sorts: [ORDER],
    reorder: {},
  }),
  clients: define<ClientItem>({
    slug: 'clients',
    entity: 'client',
    newLabel: 'collection.new.clients',
    title: (c) => ru(c.name),
    subtitle: (c) => ru(c.industry_label),
    thumb: (c) => c.logo,
    columns: [
      { label: 'collection.columns.industry', render: (c) => mono(c.industry) },
      {
        label: 'collection.columns.testimonial',
        render: (c) => (c.testimonial ? tAdmin('collection.filters.yes') : '—'),
      },
    ],
    filters: [
      PUBLISHED_ONLY,
      {
        name: 'industry',
        label: 'collection.columns.industry',
        type: 'meta',
        list: 'client_industries',
      },
      {
        name: 'has_testimonial',
        label: 'collection.columns.testimonial',
        type: 'boolean',
        yes: 'collection.filters.yes',
        no: 'collection.filters.no',
      },
    ],
    sorts: [ORDER, { value: 'industry', label: 'collection.sort.industry' }],
    reorder: {},
  }),
  'timeline-events': define<TimelineEventItem>({
    slug: 'timeline-events',
    entity: 'timeline_event',
    newLabel: 'collection.new.timeline-events',
    title: (e) => ru(e.title),
    subtitle: (e) => String(e.year),
    thumb: (e) => e.image,
    columns: [{ label: 'collection.columns.year', render: (e) => e.year }],
    filters: [PUBLISHED_ONLY],
    sorts: [ORDER, { value: '-year', label: 'collection.sort.yearDesc' }],
    // The site shows events by year; dragging only orders events of the same year.
    reorder: { group: (e) => String(e.year), groupHint: 'collection.reorder.sameYear' },
  }),
  stats: define<StatItem>({
    slug: 'stats',
    entity: 'stat',
    newLabel: 'collection.new.stats',
    title: (s) =>
      `${s.prefix ? `${s.prefix} ` : ''}${s.value.toLocaleString('ru-RU')}${ru(s.suffix)}`,
    subtitle: (s) => ru(s.label),
    columns: [{ label: 'collection.columns.context', render: (s) => mono(s.context) }],
    filters: [
      PUBLISHED_ONLY,
      { name: 'context', label: 'collection.columns.context', type: 'meta', list: 'stat_contexts' },
    ],
    sorts: [ORDER],
    // Blocks show one set at a time: the order matters within a set.
    reorder: { group: (s) => s.context, groupHint: 'collection.reorder.sameContext' },
  }),
  vacancies: define<VacancyItem>({
    slug: 'vacancies',
    entity: 'vacancy',
    newLabel: 'collection.new.vacancies',
    title: (v) => ru(v.title),
    subtitle: (v) => ru(v.location),
    columns: [
      divisionColumn(),
      {
        label: 'collection.columns.employment',
        render: (v, meta) => metaLabel(meta, 'employment_types', v.employment_type),
      },
      {
        label: 'collection.columns.open',
        render: (v) =>
          v.is_open ? (
            <Badge tone="success">{tAdmin('collection.open')}</Badge>
          ) : (
            <Badge>{tAdmin('collection.closed')}</Badge>
          ),
      },
    ],
    filters: [
      PUBLISHED_ONLY,
      DIVISION_FILTER,
      {
        name: 'is_open',
        label: 'collection.columns.open',
        type: 'boolean',
        yes: 'collection.open',
        no: 'collection.closed',
      },
    ],
    sorts: [ORDER],
    reorder: {},
  }),
}

export function collectionConfig(slug: string | undefined): CollectionConfig | null {
  return slug && slug in COLLECTION_CONFIGS ? COLLECTION_CONFIGS[slug as CollectionSlug] : null
}

/** The name of a record in lists and headings. */
export function itemTitle(config: CollectionConfig, item: CollectionItem): string {
  return config.title(item).trim() || tAdmin('collection.untitled')
}
