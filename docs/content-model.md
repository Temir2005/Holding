# Модель контента

Гибридный подход: страницы собираются из упорядоченных секций (блоков), а повторяющиеся сущности (проекты, люди, клиенты…) живут в отдельных типизированных таблицах. Секции ссылаются на сущности по id или по ключу, API при отдаче страницы разворачивает ссылки в полные объекты.

Страницы публикуются версиями: строки `section` — черновик, сайт показывает замороженный снимок из `page_revision`. Коллекции версий не имеют, их `is_published` действует сразу.

## Общие правила

- Первичные ключи — UUID. У всех таблиц есть `created_at` и `updated_at`.
- У редактируемых таблиц есть `version` (int): каждая правка через админку увеличивает его, устаревшая версия в запросе даёт `409 VERSION_CONFLICT`.
- У публикуемых сущностей есть `is_published`. Публичное API отдаёт только опубликованное.
- Порядок задаётся полем `sort_order` (int, по возрастанию, шаг 10). Новая запись встаёт в конец.
- `slug` уникален в пределах таблицы: латиница в нижнем регистре, цифры и одиночные дефисы.

### LocalizedText

JSONB вида `{"ru": "...", "kk": "...", "en": "..."}`. В таблицах ниже такие поля помечены `L`.

- Публичное API принимает `?locale=ru|kk|en` и отдаёт готовую строку: `value[locale]`, если она есть и не пустая, иначе `value["ru"]`.
- Админское API отдаёт и принимает объект целиком.
- В колонках таблиц хранятся только языки с текстом: пустая строка и `null` выбрасываются при сохранении (`drop_empty_languages`).
- У обязательных полей (название страницы, имя направления, ФИО…) русский текст обязателен и не может быть пустым (`RequiredText`). В данных секций и настройках то же правило проверяет админка при сохранении; модель чтения пустую строку принимает, чтобы уже сохранённые данные не ломали сайт.

### Media (как отдаёт публичное API)

```json
{
  "id": "uuid",
  "url": "http://localhost:9000/megasmart-media/media/2026/10/<uuid>.jpg",
  "width": 2400,
  "height": 1600,
  "alt": "Строительная площадка AAAG",
  "mime_type": "image/jpeg",
  "placeholder": { "dominant_color": "#5a5248", "blurhash": null },
  "variants": [{ "width": 480, "height": 320, "url": "…_w480.webp" }, { "width": 960, … }]
}
```

`variants` — WebP-копии шириной 480/960/1600/2400 px (не шире оригинала), только у растровых картинок.

## Таблицы контента

### media
| Поле | Тип | Примечание |
|---|---|---|
| s3_key, bucket | text | ключ случайный: `media/<год>/<месяц>/<uuid>.<ext>` |
| mime_type, size_bytes | text, int | реальные, проверены по содержимому |
| width, height | int | `0×0` у PDF и у MP4 без `faststart` |
| alt | L | |
| blurhash, dominant_color | text, null | `#rrggbb` |
| original_filename | text, null | имя файла у пользователя |
| folder | text, null | папка в медиатеке |
| tags | text[] | |
| status | `pending` / `ready` | `pending` — загрузка не завершена, в медиатеке не видна |
| uploaded_by | → admin_user, null | |
| variants | JSONB | `[{width, height, key, size_bytes}]` |
| version | int | |

### site_settings (одна строка)
`site_name L`, `logo_id → media`, `navigation` (JSONB: список `{label L, page_slug? | anchor? | url?}`), `contacts` (JSONB: `address L`, `phones`, `email`, `whatsapp`, `hours L`, `coordinates {lat, lng}`), `socials` (JSONB: список `{type, url}`, `type` из `social_types`), `footer` (JSONB: `text L`, `legal L`), `default_seo` (JSONB: `title L`, `description L`, `og_image_id → media`), `version`.

JSONB-части валидируются схемами `app/schemas/site.py`. Строку создают сиды; админка её только читает и заменяет целиком. Её наличие — признак «база не пустая» для сидов.

### page
`slug` (уникален), `title L`, `seo_title L`, `seo_description L`, `og_image_id → media`, `is_published`, `sort_order`, `version`, `published_revision_id → page_revision, null`, `published_at`.

- `title`, SEO и `og_image_id` — черновик; на сайте они из снимка.
- `slug`, `sort_order`, `is_published` действуют сразу.
- Страница `home` — главная: её нельзя удалить, переименовать и снять с сайта.

### page_revision
| Поле | Тип | Примечание |
|---|---|---|
| page_id | → page | каскадное удаление |
| number | int | 1, 2, 3… в пределах страницы, уникален вместе с `page_id` |
| snapshot | JSONB | `{format: 1, page: {title, seo_title, seo_description, og_image_id}, sections: [{id, type, sort_order, is_visible, anchor, tone, data}]}` |
| comment | text, null | что изменилось |
| created_by | → admin_user, null | null — система (сиды, миграция) |

Скрытые секции в снимке есть (чтобы откат их вернул), сайт их пропускает. Формат снимка — `app/schemas/revisions.py`, собирает его `app/services/snapshots.py`.

### section (черновик)
| Поле | Тип | Примечание |
|---|---|---|
| page_id | → page | каскадное удаление |
| type | text (`SectionType`) | строка, не enum в БД: новый тип не требует миграции |
| sort_order | int | |
| is_visible | bool | |
| anchor | text, null | для якорной навигации, уникален в пределах страницы |
| tone | `dark` / `light` / `accent` | фон блока, ритм страницы |
| data | JSONB | валидируется схемой по `type` |
| version | int | |

### division
`slug`, `name L`, `tagline L`, `description L`, `logo_id → media`, `cover_id → media`, `stats` (JSONB: список `{value, suffix L, label L}`), `website_url`, `page_slug` (страница направления, null), `sort_order`, `is_published`, `version`.

### project
`slug`, `title L`, `division_id → division`, `status` (`completed` | `in_progress` | `planned`), `location L`, `year`, `area_m2`, `short_description L`, `body L` (Markdown), `cover_id → media`, `tags` (text[]), `is_featured`, `is_tokenized`, `sort_order`, `is_published`, `version`.

Галерея: таблица `project_media (project_id, media_id, sort_order)`.

### person
`full_name L`, `position L`, `division_id → division null`, `bio L`, `photo_id → media`, `linkedin_url`, `is_key`, `is_founder`, `sort_order`, `is_published`, `version`.

### client
`name L`, `logo_id → media`, `industry` (ключ отрасли для фильтра) + `industry_label L`, `description L`, `testimonial` (JSONB null: `{quote L, author L, position L}`), `website_url`, `sort_order`, `is_published`, `version`.

### timeline_event
`year`, `title L`, `description L`, `image_id → media null`, `sort_order`, `is_published`, `version`.

### stat
`value`, `prefix`, `suffix L`, `label L`, `context` (набор: `home`, `development`, `smart-panels`… — по нему блок «Цифры» выбирает цифры), `sort_order`, `is_published`, `version`.

### vacancy
`title L`, `division_id → division null`, `location L`, `employment_type` (`full_time` | `part_time` | `contract` | `internship`), `description L`, `is_open`, `sort_order`, `is_published`, `version`.

### lead
`name`, `phone`, `email`, `message`, `type` (`investor` | `partner` | `candidate` | `client`), `source_page`, `locale`, `user_agent`, `ip_hash` (соль + sha256, сам IP не хранится), `status` (`new` | `in_progress` | `done` | `spam`), `manager_note`, `version`. Один из `phone`/`email` обязателен. Создаётся только публичной формой.

## Служебные таблицы админки

- `admin_user`: `email` (уникален), `password_hash` (argon2), `full_name`, `role` (`admin` | `editor`), `is_active`, `last_login_at`, `password_changed_at`, `version`.
- `refresh_token`: `user_id`, `token_hash` (sha256, сам токен не хранится), `family_id` (одна сессия браузера), `expires_at`, `revoked_at`, `replaced_by_id`, `user_agent`, `ip_hash`.
- `audit_log`: `user_id` (null — система), `action`, `entity_type`, `entity_id`, `changes` (JSONB: правка — `{поле: [было, стало]}`, создание/удаление — снимок; пароли и хеши токенов заменены на `***`), `ip_hash`.

## Типы секций

В таблице: что хранится в `data` → во что API это разворачивает. Поля `eyebrow L` и `title L` есть у всех секций и не повторяются. Звёздочка — обязательное поле.

| type | Название в админке | Хранится в data | Разворачивается в |
|---|---|---|---|
| `hero` | Главный экран | `subtitle L`, `background_media_id`, `video_media_id`, `ctas` (список `{label L*, href*, variant}`), `swatches` (список `{code, label L, color, finish}`) | `background`, `video` |
| `stats` | Цифры | `stat_ids` или `context` (набор) | `stats` |
| `about_text` | Текст | `body L*` (Markdown), `media_id`, `layout` | `media` |
| `timeline` | История | `event_ids` | `events` |
| `divisions_grid` | Направления | `division_ids` | `divisions` |
| `projects_showcase` | Избранные проекты | `project_ids` или `featured`, `link` | `projects` |
| `project_list` | Список проектов | `project_ids` или `division_slug`, `show_filter` | `projects` |
| `capabilities` | Преимущества | `intro L`, `items` (список `{icon*, title L*, text L*, media_id}`), `columns` | `media` у пунктов |
| `process_steps` | Этапы | `intro L`, `steps` (список `{title L, text L, media_id, division_id}`) | `media`, `division` у шагов |
| `production` | Производство | `body L*`, `facts` (список `{value, label L}`), `gallery_media_ids` | `gallery` |
| `tokenization_explainer` | Токенизация | `intro L*`, `steps`, `benefits`, `disclaimer L*`, `project_ids` | `projects` |
| `team_grid` | Команда | `intro L`, `mode` (`founder` / `key` / `all`), `show_division_filter`, `person_ids` | `people` |
| `clients_marquee` | Бегущая строка клиентов | `client_ids` | `clients` |
| `clients_grid` | Сетка клиентов | `client_ids`, `show_industry_filter` | `clients` |
| `testimonials` | Отзывы | `client_ids` | `clients` |
| `quote` | Цитата | `text L*`, `person_id`, `media_id` | `person`, `media` |
| `cta` | Призыв к действию | `text L`, `ctas`, `media_id` | `media` |
| `contact_form` | Форма заявки | `text L`, `lead_types`, `default_type`, `consent_text L*`, `success_text L*` | без изменений |
| `media_gallery` | Галерея | `media_ids`, `layout` | `items` |
| `video` | Видео | `video_media_id` или `embed_url`, `poster_media_id` | `video`, `poster` |
| `vacancies` | Вакансии | `intro L`, `vacancy_ids` или `division_slug`, `empty_text L` | `vacancies` |
| `geography` | География | `intro L`, `countries` (список `{code, name L}`) | без изменений |

Точная схема каждого типа с подсказками для формы — `GET /api/v1/admin/section-types`. Источник истины — `backend/app/schemas/sections.py`.

**Живые выборки.** Если явные id не заданы, блок выбирает записи сам (хуки в `app/services/pages.py`, явные id всегда важнее):
- `stats` — цифры набора `context`;
- `timeline` — все события;
- `projects_showcase` с `featured` — избранные проекты;
- `project_list` — все проекты или проекты направления `division_slug`;
- `team_grid` — люди по `mode`;
- `clients_marquee`, `clients_grid` — все клиенты; `testimonials` — клиенты с отзывом;
- `vacancies` — открытые вакансии, все или направления `division_slug`.

**Ссылки по ключу.** `division_slug` и `context` хранят не id, а ключ. Админка проверяет, что направление существует и в наборе есть хотя бы одна цифра, и не даёт сломать ключ: сменить адрес направления или убрать последнюю цифру набора, пока его показывают блоки.

У каждой секции в ответе API есть `id`, `type`, `anchor`, `tone` и `data`.

### Ошибки при чтении

- Ссылка на удалённую или неопубликованную сущность молча выбрасывается из списка, страница не падает.
- Невалидный `data`: секция пропускается, в лог пишется ошибка. Через админку такой `data` не сохранить и не опубликовать.

## Публичное API (v1)

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/v1/health` | статус БД и S3 |
| GET | `/api/v1/settings?locale=` | `SiteSettingsRead` |
| GET | `/api/v1/pages/{slug}?locale=` | `PageRead` из опубликованной версии |
| GET | `/api/v1/projects?division=&status=&featured=&locale=` | `ProjectCard[]` |
| GET | `/api/v1/projects/{slug}?locale=` | `ProjectRead` (с галереей) |
| GET | `/api/v1/people?division=&key=&locale=` | `PersonRead[]` |
| GET | `/api/v1/clients?locale=` | `ClientRead[]` |
| GET | `/api/v1/vacancies?locale=` | `VacancyRead[]` |
| POST | `/api/v1/leads` | 201; honeypot-поле `website`, лимит частоты по IP |
| GET | `/api/v1/preview/pages/{slug}?token=&locale=` | `PageRead` из черновика, по токену предпросмотра |

Публичные `GET` отдают `ETag` и `Cache-Control: public, max-age=0, must-revalidate`; на `If-None-Match` — `304`.

## Как добавить тип секции

1. **Схемы** — `backend/app/schemas/sections.py`:
   - значение в `SectionType`;
   - хранимая модель `XxxData(SectionData)`. У каждого поля — `field("Русское название", widget=…)`. Тексты — `L` (`LocalizedText`), ссылки — `Annotated[uuid.UUID | None, Ref(RefKind.…, "имя_в_ответе")]`, фильтры по ключу — `Annotated[str | None, KeyOf(KeyKind.…)]`, иконки — `IconName`, ссылки кнопок — `Cta`;
   - модель ответа `XxxDataRead(SectionDataRead)`: ссылки заменены объектами (`Media`, `ProjectCard`…), тексты — строки;
   - обёртка `XxxSection(SectionBase)` с `type: Literal["xxx"]` и `data: XxxDataRead`, добавить её в объединение `SectionRead`;
   - запись в `SECTION_SCHEMAS` с `label` и `description` для админки.
2. **Живая выборка** (если блок сам выбирает записи) — хук в `HOOKS` в `backend/app/services/pages.py`; при необходимости — метод в `ContentRepository`.
3. **Правила между полями** (если есть) — `consistency_errors` в `backend/app/services/admin/sections.py`.
4. **Миграция не нужна**: `section.type` — строка, `data` — JSONB.
5. **Фронтенд**: `make gen-types`, компонент в `frontend/src/sections/`, регистрация в `sectionRegistry` (`registry.ts`) — без неё не соберётся проверка типов.
6. **Проверка**: `make test`. Тесты `section-types` сами проверят, что у нового типа есть подписи полей и подсказки для текстов и ссылок. Добавить блок в сиды, если он нужен на стартовых страницах.

## Как добавить коллекцию

На примере `award` (награды).

1. **Модель** — `backend/app/models/entities.py`: `class Award(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base)`, тексты — `Mapped[LText]`, файлы — `media_fk()`. Экспорт в `app/models/__init__.py`.
2. **Миграция**: `docker compose … exec backend alembic revision --autogenerate -m "awards"`, проверить файл, `make migrate`. Тест `alembic check` следит, что модели и миграции совпадают.
3. **Админские схемы** — `backend/app/schemas/admin/collections.py`: `AwardCreate`, `AwardUpdate(VersionedUpdate)` с `not_null` для обязательных полей, `AwardAdminRead(Timestamps)` с карточками ссылок, при необходимости `AwardFilters`. Обязательные тексты — `RL` (`RequiredText`).
4. **Репозиторий** — `backend/app/repositories/admin/collections.py`: `AwardRepository(AdminRepository[Award])` с `search_columns`, `sort_columns`, `default_order`.
5. **Сервис** — `backend/app/services/admin/collections.py`: `AwardService(CollectionService[...])` с `model`, `text_fields`, `ref_fields` (колонки-ссылки и их вид), `ref_kind` (если на записи ссылаются блоки), `to_read(obj, cards)`. Уникальность slug и другие проверки — в `validate(obj, before)`.
6. **Роутер** — `backend/app/api/routers/admin/collections.py`: `crud_routes("/awards", …)` даёт список, создание, чтение, правку, удаление и порядок.
7. **Если блоки будут ссылаться на награды**:
   - значение в `RefKind` (`app/schemas/refs.py`);
   - в `app/services/admin/refs.py`: `ENTITY_MODELS`, `KIND_LABELS`, `SEARCH_COLUMNS`, ветка в `RefService.card`;
   - публичная модель `AwardRead` в `app/schemas/entities.py`, метод в `Mapper`, строка в `PUBLISHED` (`app/services/pages.py`).
   После этого `lookup`, проверка ссылок, разворачивание и запрет удаления используемых записей работают сами.
8. **Публичный список** (если нужен на сайте отдельно от блоков) — метод в `ContentRepository` и эндпоинт в `app/api/routers/public/content.py`; изменение публичного API согласовать.
9. **Тесты и сиды**: добавить строку в `CASES` в `tests/test_collections_admin.py` (общий контракт коллекций), стартовые записи — в `seed/content.py`.
