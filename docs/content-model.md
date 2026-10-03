# Модель контента

Гибридный подход: страницы собираются из упорядоченных секций, а повторяющиеся сущности (проекты, люди, клиенты…) живут в отдельных типизированных таблицах. Секции ссылаются на сущности по id, API при отдаче страницы разворачивает ссылки в полные объекты.

## Общие правила

- Первичные ключи — UUID. У всех таблиц есть `created_at` и `updated_at`.
- У публикуемых сущностей есть `is_published`. Публичное API отдаёт только опубликованное.
- Порядок задаётся полем `sort_order` (int, по возрастанию).
- `slug` уникален в пределах таблицы, только латиница, цифры и дефис.

### LocalizedText

JSONB вида `{"ru": "...", "kk": "...", "en": "..."}`. Ключ `ru` обязателен, остальные необязательны.

API принимает `?locale=ru|kk|en` и отдаёт уже готовую строку: `value[locale]`, если она есть и не пустая, иначе `value["ru"]`. Админское API (позже) отдаёт объект целиком.

В таблицах ниже такие поля помечены `L`.

### Media (как отдаёт API)

```json
{
  "id": "uuid",
  "url": "http://localhost:9000/megasmart-media/projects/aaag-cover.jpg",
  "width": 2400,
  "height": 1600,
  "alt": "Строительная площадка AAAG",
  "mime_type": "image/jpeg",
  "placeholder": { "dominant_color": "#5a5248", "blurhash": "LEHV6nWB2yk8..." }
}
```

## Таблицы

### media
| Поле | Тип | Примечание |
|---|---|---|
| id | uuid | |
| s3_key | text | уникален в пределах бакета |
| bucket | text | |
| mime_type | text | |
| size_bytes | int | |
| width, height | int | обязательны, против layout shift |
| alt | L | |
| blurhash | text, null | |
| dominant_color | text, null | `#rrggbb` |

### site_settings (singleton)
`site_name L`, `logo → media`, `logo_dark → media, null`, `navigation` (JSONB: список `{label L, page_slug | url, anchor?}`), `contacts` (JSONB: адрес L, телефоны, email, whatsapp, координаты карты), `socials` (JSONB: список `{type, url}`), `footer` (JSONB: текст L, юридическая строка L), `default_seo` (title L, description L, og_image → media).

JSONB-поля валидируются Pydantic-схемами так же, как `section.data`.

### page
`slug` (уникален), `title L`, `seo_title L`, `seo_description L`, `og_image → media`, `is_published`, `sort_order`.

### section
| Поле | Тип | Примечание |
|---|---|---|
| page_id | → page | каскадное удаление |
| type | enum `SectionType` | |
| sort_order | int | |
| is_visible | bool | |
| anchor | text, null | для якорной навигации, уникален в пределах страницы |
| data | JSONB | валидируется схемой по `type` |

### division
`slug`, `name L`, `tagline L`, `description L`, `logo → media`, `cover → media`, `stats` (JSONB: список `{value, suffix L, label L}`), `website_url`, `page_slug` (страница подразделения, null), `sort_order`, `is_published`.

### project
`slug`, `title L`, `division_id → division`, `status` (`completed` | `in_progress` | `planned`), `location L`, `year int null`, `area_m2 numeric null`, `short_description L`, `body L` (Markdown), `cover → media`, `tags` (text[]), `is_featured`, `is_tokenized`, `sort_order`, `is_published`.

Галерея: таблица `project_media (project_id, media_id, sort_order)`, первичный ключ `(project_id, media_id)`.

### person
`full_name L`, `position L`, `division_id → division null`, `bio L`, `photo → media`, `linkedin_url`, `is_key`, `is_founder`, `sort_order`, `is_published`.

### client
`name L`, `logo → media`, `industry` (text, ключ отрасли для фильтра) + `industry_label L`, `description L`, `testimonial` (JSONB null: `{quote L, author L, position L}`), `website_url`, `sort_order`, `is_published`.

### timeline_event
`year int`, `title L`, `description L`, `image → media null`, `sort_order`, `is_published`.

### stat
`value numeric`, `prefix text null`, `suffix L`, `label L`, `context` (text: `home`, `development`, `smart-panels`… — для выборки в секцию), `sort_order`.

### vacancy
`title L`, `division_id → division null`, `location L`, `employment_type` (`full_time` | `part_time` | `contract` | `internship`), `description L`, `is_open`, `sort_order`.

### lead
`name`, `phone null`, `email null`, `message null`, `type` (`investor` | `partner` | `candidate` | `client`), `source_page`, `locale`, `user_agent`, `ip_hash`. Без `is_published`. Один из `phone`/`email` обязателен.

## Типы секций

Каждая схема хранит ссылки. Ниже: что хранится в `data` → во что API это разворачивает. Поля `eyebrow L` и `title L` есть почти у всех секций и для краткости не повторяются.

| type | Хранится в data | Разворачивается в |
|---|---|---|
| `hero` | `subtitle L`, `background_media_id`, `video_media_id?`, `ctas` (список `{label L, href, variant}`), `swatches?` (список `{code, label L, color, finish}`) | `background: Media`, `video: Media?` |
| `stats` | `stat_ids` или `context` | `stats: Stat[]` |
| `about_text` | `body L` (Markdown), `media_id?`, `layout` | `media: Media?` |
| `timeline` | `event_ids` (пусто = все опубликованные) | `events: TimelineEvent[]` |
| `divisions_grid` | `division_ids` | `divisions: Division[]` |
| `projects_showcase` | `project_ids` или `featured: true` | `projects: Project[]` |
| `project_list` | `division_id?`, `statuses_filter`, `show_filter` | `projects: Project[]` |
| `capabilities` | `items` (список `{icon, title L, text L}`) | без изменений |
| `process_steps` | `steps` (список `{title L, text L, media_id?, link_division_id?}`) | `media`, `division` у шагов |
| `production` | `body L`, `facts` (список `{value, label L}`), `gallery_media_ids` | `gallery: Media[]` |
| `tokenization_explainer` | `intro L`, `steps` (список `{icon, title L, text L}`), `benefits` (список L), `disclaimer L`, `project_ids` | `projects: Project[]` |
| `team_grid` | `mode` (`founder` / `key` / `all`), `person_ids?`, `division_filter` | `people: Person[]` |
| `clients_marquee` | `client_ids` (пусто = все) | `clients: Client[]` |
| `clients_grid` | `client_ids`, `show_industry_filter` | `clients: Client[]` |
| `testimonials` | `client_ids` (у которых есть testimonial) | `items: Testimonial[]` |
| `quote` | `text L`, `person_id`, `media_id?` | `person: Person`, `media: Media?` |
| `cta` | `text L`, `ctas`, `media_id?`, `tone` (`dark` / `light` / `accent`) | `media: Media?` |
| `contact_form` | `lead_types` (какие типы доступны), `default_type`, `consent_text L`, `success_text L` | без изменений |
| `media_gallery` | `media_ids`, `layout` | `items: Media[]` |
| `video` | `video_media_id` или `embed_url`, `poster_media_id` | `video: Media?`, `poster: Media` |
| `vacancies` | `division_filter?` | `vacancies: Vacancy[]` |
| `geography` | `countries` (список `{code, name L}`), `media_id?` | `media: Media?` |

`vacancies` и `geography` добавлены к списку из ТЗ: страницам «Команда» и «Smart Panels» нужны эти блоки, а держать их в общем `about_text` значит потерять структуру для CMS.

У каждой секции в ответе API есть `id`, `type`, `anchor`, `tone` (`dark` / `light`, для ритма страницы) и `data`.

### Ошибки

- Ссылка на удалённую или неопубликованную сущность молча выбрасывается из списка, страница не падает. В лог пишется предупреждение.
- Невалидный `data` при чтении: секция пропускается, в лог пишется ошибка. При записи через админку такой `data` не пройдёт валидацию.

## Публичное API (v1)

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/v1/health` | статус БД и S3 |
| GET | `/api/v1/settings?locale=` | `SiteSettingsRead` |
| GET | `/api/v1/pages/{slug}?locale=` | `PageRead` с развёрнутыми секциями |
| GET | `/api/v1/projects?division=&status=&featured=&locale=` | `ProjectCard[]` |
| GET | `/api/v1/projects/{slug}?locale=` | `ProjectRead` (с галереей) |
| GET | `/api/v1/people?division=&key=&locale=` | `PersonRead[]` |
| GET | `/api/v1/clients?locale=` | `ClientRead[]` |
| GET | `/api/v1/vacancies?locale=` | `VacancyRead[]` |
| POST | `/api/v1/leads` | 201; honeypot-поле `website`, rate limit по IP |
