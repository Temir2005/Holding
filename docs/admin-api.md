# Админское API

Все эндпоинты под `/api/v1/admin`. Полное описание с моделями — в Swagger: `http://localhost:8000/docs` (теги `admin: …`). Этот файл объясняет то, чего нет в схеме: как устроены вход, ошибки, списки, публикация и формы, и что учесть интерфейсу админки. В конце — пример рабочей сессии запросами `curl`.

Что сознательно отложено, описано в `docs/architecture.md`, раздел «Сознательно отложено».

## Карта эндпоинтов

| Область | Эндпоинты | Роль |
|---|---|---|
| Вход | `auth/login`, `auth/refresh`, `auth/logout`, `auth/me`, `auth/password` | любой вошедший |
| Описание схем | `GET meta`, `GET section-types`, `GET lookup` | editor |
| Медиатека | `media`, `media/folders`, `media/upload-url`, `media/{id}/complete`, `media/{id}`, `media/{id}/usages` | editor |
| Страницы | `pages`, `pages/order`, `pages/{id}`, `pages/{id}/sections`, `pages/{id}/sections/order` | editor |
| Публикация | `pages/{id}/publish`, `…/unpublish`, `…/discard-draft`, `…/revisions`, `…/revisions/{n}`, `…/revisions/{n}/restore`, `…/preview-token` | editor |
| Секции | `sections/{id}`, `sections/{id}/duplicate` | editor |
| Коллекции | `divisions`, `projects`, `people`, `clients`, `timeline-events`, `stats`, `vacancies` (+ `/order`, `/{id}`); `projects/{id}/gallery` | editor |
| Заявки | `leads`, `leads/{id}`, `leads/export` | editor |
| Настройки сайта | `GET`/`PUT settings` | admin |
| Пользователи | `users`, `users/{id}`, `users/{id}/password` | admin |
| Журнал действий | `audit-log` | admin |

Вне `/admin`: `GET /api/v1/preview/pages/{slug}?token=` — предпросмотр черновика по ссылке (см. «Публикация»).

## Вход

| Запрос | Что делает |
|---|---|
| `POST /admin/auth/login` `{email, password}` | Выдаёт `access_token` (15 минут) в теле и refresh-токен в httpOnly cookie |
| `POST /admin/auth/refresh` | Меняет refresh-cookie на новую и выдаёт новый `access_token` |
| `POST /admin/auth/logout` | Завершает сессию этого браузера |
| `GET /admin/auth/me` | Текущий пользователь |
| `POST /admin/auth/password` | Смена своего пароля; остальные сессии завершаются, текущая получает новые токены |

- `access_token` передаётся в заголовке `Authorization: Bearer …`. Хранить его в памяти приложения, не в `localStorage`.
- Refresh-токен интерфейс не видит и не хранит: это cookie `ms_refresh` с флагами `HttpOnly`, `SameSite=Strict` и путём `/api/v1/admin/auth`. Браузер сам отправляет его на `refresh` и `logout`.
- **Админка должна открываться с того же origin, что и API** (в продакшене — через Caddy, см. `docs/architecture.md`, раздел «Деплой»; в разработке — через прокси Vite). На другом домене cookie не дойдёт.
- Первый администратор создаётся командой `python -m app.cli create-admin --email … --name …` (пароль спросит интерактивно; для скриптов — `--password-stdin`). Открытой регистрации нет.
- Частые неудачные попытки входа с одного IP и email ограничиваются: `429 RATE_LIMITED`.

### Обновление токена — только в одном месте

Refresh-токен одноразовый: каждый `POST /auth/refresh` гасит текущий и выдаёт новый. Если старый токен предъявят ещё раз, сервер решит, что его украли, и **отзовёт всю сессию** (`REFRESH_TOKEN_REUSED`).

Поэтому:
- в интерфейсе должна быть **одна функция обновления токена**, через которую идут все запросы. Параллельные запросы с истёкшим токеном ждут один общий промис обновления, а не вызывают `refresh` каждый сам;
- **несколько вкладок** делят одну cookie. Если каждая вкладка обновляет токен сама, две вкладки одновременно отправят один и тот же refresh-токен, и вторая отзовёт сессию у обеих. Обновление нужно координировать между вкладками: например, через `navigator.locks.request("ms-refresh", …)` или `BroadcastChannel`, где одна вкладка обновляет, а остальные получают новый `access_token`;
- на `401` с кодом `TOKEN_EXPIRED` — обновить токен и повторить запрос один раз. На `REFRESH_TOKEN_REUSED`, `REFRESH_TOKEN_EXPIRED`, `INVALID_REFRESH_TOKEN`, `TOKEN_REVOKED` — показать экран входа.

## Роли

- `editor` — контент, медиа, публикация, заявки.
- `admin` — всё, плюс пользователи, журнал действий и настройки сайта.

Права проверяются на сервере на каждый запрос: отключение пользователя или смена роли действуют сразу. Пользователей не удаляют, а отключают (`PATCH users/{id}` с `is_active: false`), чтобы журнал сохранял имена. Нельзя отключить себя (`SELF_LOCKOUT`) и последнего активного администратора (`LAST_ADMIN`).

## Ошибки

Любая ошибка админского API и предпросмотра:

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "Запись изменилась…", "details": { "expected_version": 1, "current_version": 2 } } }
```

- `code` стабильный, по нему интерфейс выбирает реакцию; `message` можно показать человеку.
- Ошибки полей (`VALIDATION_ERROR`, 422): `details` — список `{loc, msg}`, где `loc` — путь до поля, например `["body", "data", "steps", 0, "title", "ru"]`. Ошибки при публикации дополнительно содержат `section_id`.
- Публичное API (`/pages`, `/settings`…) отвечает в формате FastAPI `{"detail": …}`: на нём работает сайт.

| Код | Статус | Когда |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Поля не прошли проверку; в `details` список полей |
| `NOT_FOUND` | 404 | Записи нет |
| `UNAUTHORIZED`, `NOT_AUTHENTICATED`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `USER_INACTIVE`, `BAD_CREDENTIALS` | 401 | Вход и токены |
| `NO_REFRESH_TOKEN`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REUSED` | 401 | Обновление токена |
| `FORBIDDEN` | 403 | Не хватает роли |
| `VERSION_CONFLICT` | 409 | Запись изменили после того, как её открыли |
| `ORDER_MISMATCH` | 409 | Список для перестановки не совпал с текущим набором |
| `ALREADY_EXISTS` | 409 | Занят адрес (slug), email или якорь |
| `IN_USE` | 409 | Удаление или смена адреса сломали бы ссылки; в `details` список мест |
| `PROTECTED_PAGE` | 409 | Главную нельзя удалить, переименовать или снять с сайта |
| `DRAFT_CHANGED`, `NO_CHANGES`, `NOT_PUBLISHED` | 409 | Публикация, см. ниже |
| `SELF_LOCKOUT`, `LAST_ADMIN` | 409 | Пользователи |
| `UPLOAD_MISSING`, `UPLOAD_ALREADY_COMPLETED` | 409 | Загрузка файла |
| `MEDIA_TYPE_NOT_ALLOWED`, `MEDIA_TOO_LARGE`, `MEDIA_TYPE_MISMATCH` | 422 | Загрузка файла |
| `RATE_LIMITED` | 429 | Слишком много попыток входа |

## Списки

Параметры: `page` (с 1), `page_size` (до 100), `q` (поиск), `sort` (`field` или `-field`, только разрешённые поля). Ответ:

```json
{ "items": [ … ], "total": 42, "page": 1, "page_size": 20 }
```

У коллекций, заявок и медиа есть свои фильтры (`is_published`, `division_id`, `status`, `type`, `folder`…) — они перечислены в Swagger у каждого списка.

## Одновременная правка

У редактируемых записей есть `version`. В `PATCH`, `PUT` и `DELETE` (через `?version=`) клиент присылает версию, которую видел. Если запись уже изменили, ответ — `409 VERSION_CONFLICT`: интерфейс показывает «запись изменилась» и предлагает перезагрузить. Перестановка порядка (`PUT …/order`) принимает полный список id; если набор не совпал, ответ — `409 ORDER_MISMATCH`.

`PATCH` меняет только присланные поля. Обязательное поле можно не присылать, но нельзя очистить через `null` (422). Тексты: пустая строка считается пустым языком и не сохраняется; у обязательных полей (`title`, `name`…) русский текст должен быть заполнен.

## Схема контента для форм

Интерфейс не должен дублировать списки и формы бэкенда. Всё нужное отдают три эндпоинта:

- `GET /admin/meta` — языки (`locales`, `default_locale`), перечисления с русскими подписями (`project_statuses`, `employment_types`, `lead_types`, `lead_statuses`, `tones`, `social_types`, `section_types`), список иконок, лимиты медиа и текущие варианты для выпадающих списков (`divisions`, `stat_contexts`).
- `GET /admin/section-types` — для каждого из 22 типов блоков: `type`, `label`, `description` и JSON Schema хранимых данных. По этой схеме строится форма любого блока.
- `GET /admin/lookup?kind=project&q=…` — поиск для выбора ссылки (`kind` — из подсказки `x-ref` или `page` для ссылок на страницы); `?ids=…` возвращает карточки уже выбранных объектов.

Подсказки в JSON Schema (`title` у полей — по-русски):

| Подсказка | Значение | Виджет |
|---|---|---|
| `x-widget: localized-text` / `localized-textarea` | текст на трёх языках | поле / многострочное поле с вкладками ru/kk/en |
| `x-widget: markdown` | Markdown на трёх языках | редактор Markdown |
| `x-widget: icon` | имя иконки, `enum` — список | выбор иконки |
| `x-widget: link` | `https://…`, `#якорь`, `slug` страницы или `projects/<slug>` | поле ссылки с выбором страницы через `lookup?kind=page` |
| `x-widget: page` | `slug` страницы (пункт меню) | выбор страницы через `lookup?kind=page` |
| `x-widget: color` | `#rrggbb` | выбор цвета |
| `x-widget: anchor` | якорь страницы | поле |
| `x-widget: select` + `x-options: <имя>` | значение из списка `GET /admin/meta` с этим именем | выпадающий список |
| `x-ref: {kind, many}` | id объекта (или список id) | выбор через `lookup?kind=…`, `many` — множественный с порядком |
| `x-enum-labels` | подписи значений `enum` | радиокнопки / список |

Чтение блока (`GET /admin/sections/{id}`) отдаёт `data` в хранимом виде (все языки, id ссылок, все поля со значениями по умолчанию) и `refs` — карточки объектов, на которые блок ссылается, чтобы показать выбранное без лишних запросов. Сохранение того же `data` без правок ничего не меняет.

## Медиатека

Загрузка идёт в три шага, файл не проходит через бэкенд:

1. `POST /admin/media/upload-url` `{filename, content_type, size_bytes, folder?, alt?}`. Сервер проверяет тип и заявленный размер и возвращает `media` (статус `pending`) и `upload: {url, method: "PUT", headers, expires_in}`.
2. Браузер отправляет файл: `PUT upload.url`, тело — сам файл, заголовки — ровно `upload.headers` (`Content-Type` входит в подпись, другой тип S3 отклонит). Ссылка живёт `expires_in` секунд. Хост ссылки — `S3_PRESIGN_ENDPOINT_URL` (по умолчанию `S3_PUBLIC_URL`): адрес хранилища, видимый браузеру.
3. `POST /admin/media/{id}/complete`. Сервер проверяет, что файл загружен, его реальный размер и тип **по содержимому**, читает размеры и основной цвет, очищает SVG, делает WebP-копии шириной 480/960/1600/2400 px (не шире оригинала). Ответ: `{media, warnings}`; `warnings` показать редактору (например, «из SVG удалены небезопасные части»).

Ошибки шага 3: `UPLOAD_MISSING` (файл ещё не дошёл, можно повторить), `MEDIA_TOO_LARGE`, `MEDIA_TYPE_MISMATCH` (файл не того типа; запись и объект удалены, начать заново).

- Разрешены: JPEG, PNG, WebP, AVIF, SVG (до 20 МБ), PDF (до 20 МБ), MP4 (до 200 МБ). Лимиты — в настройках бэкенда.
- Ключ в хранилище случайный (`media/2026/10/<uuid>.jpg`), исходное имя хранится в `original_filename`.
- Незавершённые загрузки не видны в медиатеке и удаляются через 24 часа (`python -m app.cli cleanup`).
- Для PDF размеры `0×0`. Для MP4 размеры читаются из начала файла; если данные о дорожках лежат в конце (видео без `faststart`), будут `0×0` и предупреждение.
- **CORS бакета.** Браузер грузит файл прямо в S3, поэтому бакет должен разрешать `PUT` с origin админки. Локальный MinIO разрешает любые origin по умолчанию; для продакшен-хранилища нужно правило CORS: `AllowedOrigins: [домен сайта]`, `AllowedMethods: [PUT]`, `AllowedHeaders: [Content-Type]`.

Метаданные: у JPEG, PNG, WebP и AVIF при `complete` вырезаются EXIF, XMP, комментарии и текстовые блоки (модель камеры, GPS, автор). Поворот из EXIF применяется к пикселям, цветовой профиль ICC сохраняется. JPEG без поворота сохраняется с исходным качеством (те же таблицы квантования), с поворотом — с качеством 92. Объект в хранилище перезаписывается очищенной версией, `size_bytes` — её размер.

Остальное:
- `GET /admin/media?kind=image|svg|video|document&folder=&q=` — список готовых файлов; `GET /admin/media/folders` — папки с количеством.
- `PATCH /admin/media/{id}` — `alt` на всех языках, папка, теги, отображаемое имя (с `version`).
- `GET /admin/media/{id}/usages` — где используется файл.
- `DELETE /admin/media/{id}?version=` — удаляет запись и все объекты в хранилище. Если файл где-то используется — `409 IN_USE`, в `details` список мест. Учитываются черновики, опубликованные версии страниц (`entity_type: "page_revision"`), коллекции и настройки сайта.

## Страницы и блоки

- `POST /admin/pages` `{slug, title, seo_title?, seo_description?, og_image_id?}` — новая страница всегда черновик, в конце списка.
- `PATCH /admin/pages/{id}` — `slug` меняется сразу (это адрес); название, SEO и og-картинка — часть черновика и попадают на сайт при публикации. Главную (`home`) нельзя переименовать или удалить (`PROTECTED_PAGE`). Адрес страницы, на которую ведут меню, кнопки или направления, менять и удалять нельзя (`IN_USE` со списком мест).
- `GET /admin/pages/{id}` — страница с блоками черновика, признаками публикации и `draft_hash` (нужен для публикации).
- `POST /admin/pages/{id}/sections` `{type, data, anchor?, tone, is_visible, position?}` — добавить блок; `position` — место с нуля, по умолчанию в конец.
- `PATCH /admin/sections/{id}` — `data`, `anchor`, `tone`, `is_visible` (скрыть/показать).
- `POST /admin/sections/{id}/duplicate` — копия сразу после оригинала, без якоря.
- `PUT /admin/pages/{id}/sections/order` `{ids}` — все блоки страницы в новом порядке.

При сохранении блока проверяется:
- `data` по схеме типа блока, ошибка указывает путь до поля;
- обязательные тексты заполнены по-русски;
- объекты по ссылкам существуют, файлы загружены до конца;
- внутренние ссылки кнопок ведут на существующую страницу или `projects/<slug>`;
- фильтры по ключу существуют: направление (`division_slug`), набор цифр с хотя бы одной цифрой (`context`);
- правила между полями (форма заявки: хотя бы одна тема, тема по умолчанию — из списка);
- якорь уникален на странице.

## Публикация

Сайт показывает **опубликованную версию** страницы. Всё, что редактор меняет в блоках, названии и SEO, — черновик, пока страницу не опубликуют.

| Запрос | Что делает |
|---|---|
| `POST …/publish` `{version, draft_hash, comment?}` | Черновик становится новой версией на сайте |
| `POST …/unpublish` `{version}` | Страница уходит с сайта (её версия хранится) |
| `POST …/discard-draft` `{version}` | Черновик возвращается к тому, что на сайте |
| `GET …/revisions` | Опубликованные версии, новые сверху; `is_current` — та, что на сайте |
| `GET …/revisions/{n}` | Версия целиком (`snapshot`: тексты, SEO, все блоки) |
| `POST …/revisions/{n}/restore` `{version, publish?, comment?}` | Версия n становится черновиком; с `publish: true` сразу идёт на сайт новой версией |
| `POST …/preview-token` | Ссылка на предпросмотр черновика на 30 минут |

- `draft_hash` берётся из `GET /admin/pages/{id}`. Если кто-то изменил страницу после того, как редактор её открыл, публикация отклоняется (`409 DRAFT_CHANGED`): на сайт не уйдут правки, которых редактор не видел.
- Перед публикацией проверяются **все** блоки сразу; ответ 422 содержит ошибки с путями `["sections", i, "data", …]` и `section_id`.
- `NO_CHANGES` — страница уже на сайте и не менялась. Снятая страница публикуется и без изменений: она возвращается на сайт без новой версии.
- `NOT_PUBLISHED` — снять со страницы, которой нет на сайте, или сбросить черновик страницы, которую ни разу не публиковали.
- Главную нельзя снять с сайта (`PROTECTED_PAGE`).
- Откат версии, которая ссылается на удалённое (файл, проект), отклоняется с 422 и списком мест; черновик не меняется.
- Признак `has_unpublished_changes` вычисляется сравнением черновика с опубликованной версией: если вернуть правку обратно, он снова `false`.
- `slug`, порядок страниц и снятие с сайта действуют сразу — это адрес и навигация, а не содержимое.
- Коллекции (проекты, люди…) версий не имеют: `is_published` у них действует сразу. Опубликованная страница показывает их актуальное состояние: снятый проект пропадёт и со страницы.

**Предпросмотр.** `preview-token` отдаёт `{token, expires_in, path}`. `GET {path}` (`/api/v1/preview/pages/{slug}?token=…`) возвращает черновик в том же формате, что и публичная `GET /api/v1/pages/{slug}`, собранный тем же кодом. Токен открывает только свою страницу и не годится для входа в админку; ответы не кэшируются. Ссылку можно отправить человеку без доступа к админке.

## Коллекции

`divisions`, `projects`, `people`, `clients`, `timeline-events`, `stats`, `vacancies` — одинаковый набор: список с фильтрами, `POST`, `GET/PATCH/DELETE /{id}`, `PUT /order`. Публикация записи — `PATCH` с `is_published`, действует сразу.

- Тексты отдаются на всех языках (`{"ru": …, "en": …}`), ссылки — id плюс карточка (`cover`, `division`…).
- Новая запись — в конце списка.
- Удаление записи, которую показывают блоки страниц (в черновике или опубликованной версии), отклоняется: `409 IN_USE`.
- Смена адреса направления или проекта, по которому блоки фильтруют или на который ведут кнопки, — тоже `IN_USE`.
- Последнюю цифру набора, который показывают блоки, нельзя перенести в другой набор или удалить.
- Галерея проекта: `PUT /admin/projects/{id}/gallery` `{version, media_ids}` — полный список в нужном порядке.

## Настройки сайта (только admin)

`GET /admin/settings` — документ целиком: название, логотип, меню, контакты, соцсети, подвал, SEO по умолчанию, плюс `refs` с карточками файлов и `version`. `PUT /admin/settings` заменяет документ целиком: прислать то, что вернул `GET`, с правками и `version` (без `id`, `refs`, `updated_at`).

Проверки: пункт меню ведёт на существующую страницу, якорь или внешнюю ссылку (`https://`, `mailto:`, `tel:`), но не на страницу и внешнюю ссылку сразу; соцсеть — из `social_types`, ссылка `https://`; обязательные тексты заполнены; файлы загружены. Настройки действуют сразу, без публикации.

## Заявки

- `GET /admin/leads?type=&status=&created_from=&created_to=&q=` — новые сверху. Даты — с часовым поясом (`2026-10-01T00:00:00+05:00`), без пояса — 422.
- `PATCH /admin/leads/{id}` `{version, status?, manager_note?}` — статусы `new`, `in_progress`, `done`, `spam`. Заявки не удаляются: спам помечается статусом.
- `GET /admin/leads/export` с теми же фильтрами — CSV для Excel (UTF-8 с BOM, разделитель `;`, время в `+05:00` — настройка `LEADS_EXPORT_UTC_OFFSET_HOURS`). Ячейки, похожие на формулу, выгружаются как текст. Выгрузка пишется в журнал.

## Журнал действий (только admin)

`GET /admin/audit-log?entity_type=&entity_id=&user_id=&action=&since=&until=` — кто и когда что сделал. `changes`: для правки — `{поле: [было, стало]}`, для создания и удаления — полный снимок. Пароли и токены не попадают в журнал. Действия: `create`, `update`, `delete`, `reorder`, `publish`, `unpublish`, `discard_draft`, `restore`, `login`, `password_change`, `password_reset`, `export`, `seed`. Записи без пользователя сделаны системой (сиды, миграции).

## Пример: рабочая сессия

```bash
API=http://localhost:8000/api/v1/admin

# Вход: access_token в теле, refresh — в cookie (-c сохраняет её в файл)
curl -s -c cookies.txt -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email": "editor@megasmart.kz", "password": "…"}'
# → {"access_token": "eyJ…", "token_type": "bearer", "expires_in": 900, "user": {…}}
TOKEN=eyJ…
H="Authorization: Bearer $TOKEN"

# Найти страницу и открыть черновик
curl -s "$API/pages?q=about" -H "$H"
# → {"items": [{"id": "6f1c…", "slug": "about", "is_published": true,
#     "published_revision_number": 3, "has_unpublished_changes": false, "version": 7, …}], …}
curl -s $API/pages/6f1c… -H "$H"
# → {…, "sections": [{"id": "a1b2…", "type": "hero", "data": {…}, "version": 4, …}],
#     "draft_hash": "9e0d…", "version": 7}

# Поправить заголовок блока (data — целиком, как пришло, с правкой)
curl -s -X PATCH $API/sections/a1b2… -H "$H" -H 'Content-Type: application/json' \
  -d '{"version": 4, "data": {"title": {"ru": "Строим города", "en": "We build cities"}, "ctas": []}}'

# Ошибка поля выглядит так:
# → 422 {"error": {"code": "VALIDATION_ERROR", "message": "Есть ссылки на несуществующие объекты",
#        "details": [{"loc": ["body", "data", "ctas", 0, "href"], "msg": "нет страницы «contact»"}]}}

# Посмотреть черновик как на сайте
curl -s -X POST $API/pages/6f1c…/preview-token -H "$H"
# → {"token": "eyJ…", "expires_in": 1800, "path": "/api/v1/preview/pages/about?token=eyJ…"}

# Опубликовать: version и свежий draft_hash из GET страницы
curl -s $API/pages/6f1c… -H "$H"          # draft_hash изменился после правки
curl -s -X POST $API/pages/6f1c…/publish -H "$H" -H 'Content-Type: application/json' \
  -d '{"version": 7, "draft_hash": "c41f…", "comment": "Новый заголовок"}'
# → {…, "published_revision_number": 4, "has_unpublished_changes": false, "version": 8}

# Передумали: вернуть версию 3 и сразу на сайт
curl -s -X POST $API/pages/6f1c…/revisions/3/restore -H "$H" -H 'Content-Type: application/json' \
  -d '{"version": 8, "publish": true}'

# Загрузить картинку
curl -s -X POST $API/media/upload-url -H "$H" -H 'Content-Type: application/json' \
  -d '{"filename": "facade.jpg", "content_type": "image/jpeg", "size_bytes": 25312, "folder": "projects"}'
# → {"media": {"id": "ee25…", "status": "pending", …},
#    "upload": {"url": "http://localhost:9000/megasmart-media/media/2026/10/ee25….jpg?X-Amz-…",
#               "method": "PUT", "headers": {"Content-Type": "image/jpeg"}, "expires_in": 900}}
curl -s -X PUT "<upload.url>" -H 'Content-Type: image/jpeg' --data-binary @facade.jpg
curl -s -X POST $API/media/ee25…/complete -H "$H"
# → {"media": {"status": "ready", "width": 1200, "height": 800, "variants": [{"width": 480, …}, …]},
#    "warnings": []}

# Обновить access_token (refresh-cookie из файла; новая cookie записывается обратно)
curl -s -b cookies.txt -c cookies.txt -X POST $API/auth/refresh
```
