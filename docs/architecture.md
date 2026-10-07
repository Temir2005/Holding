# Архитектура

## Структура репозитория

Корень репозитория служит корнем монорепозитория.

```
.
├── frontend/                 # Vite + React + TS
│   └── src/
│       ├── app/              # роутер, провайдеры (Query, i18n, Helmet)
│       ├── pages/            # PageRoute, ProjectDetail, NotFound
│       ├── sections/         # по компоненту на SectionType + registry.ts
│       ├── components/ui/    # Container, Section, Heading, Button, Tag, SmartImage
│       ├── components/layout/# Header, Footer, LangSwitch, MobileMenu
│       ├── api/              # client.ts, schema.d.ts (генерируется), hooks/
│       ├── i18n/             # ru.json, kk.json, en.json (только UI-строки)
│       └── styles/           # tokens.css, globals.css
├── backend/
│   ├── app/
│   │   ├── api/routers/      # public/*, admin/*
│   │   ├── services/         # бизнес-логика, разворачивание секций, локализация
│   │   ├── repositories/     # доступ к БД
│   │   ├── models/           # SQLAlchemy
│   │   ├── schemas/          # Pydantic: Read/Create/Update, sections.py (union)
│   │   ├── storage/          # StorageService (S3/MinIO)
│   │   ├── core/             # config, db, security, i18n
│   │   └── main.py
│   ├── alembic/
│   ├── seed/                 # images/, CREDITS.md, content.py, run.py
│   ├── tests/
│   └── pyproject.toml        # uv
├── infra/
│   ├── docker-compose.yml
│   └── minio/init.sh
├── docs/
├── Makefile
├── .env.example
├── CLAUDE.md
└── README.md
```

## Поток данных

```
Браузер ──/ru/development──▶ React Router ──▶ PageRoute
   PageRoute ──GET /api/v1/pages/development?locale=ru──▶ FastAPI
      router ─▶ PageService ─▶ PageRepository (page + sections)
                    │
                    ├─ валидирует section.data по типу (discriminated union)
                    ├─ собирает все ссылки (media_id, project_ids, person_ids…)
                    ├─ грузит их пачкой (по одному запросу на тип сущности)
                    └─ разрешает LocalizedText → строка (fallback ru)
   ◀── PageRead { seo, sections: [ {type, anchor, data: развёрнутые объекты} ] }
   PageRenderer ─▶ sectionRegistry[type] ─▶ компонент секции
   SmartImage ─▶ buildImageUrl(media) ─▶ MinIO (публичный бакет)
```

## Локали и URL

- `/` редиректит на `/ru`. Маршруты: `/:locale`, `/:locale/:slug`, `/:locale/projects/:slug`.
- Главная — страница со slug `home`.
- Неизвестная локаль ведёт на `/ru`, неизвестный slug — на 404 (тоже страница из CMS, если есть).

## Изображения

- Публичный бакет `megasmart-media` с политикой на чтение. `StorageService.public_url(key)` строит URL; в проде можно заменить на CDN или presigned без правки фронта.
- `buildImageUrl(media, { width })` на фронте сейчас возвращает `media.url`. Позже здесь подключится imgproxy.

## Локальная разработка

- Node.js и Python запускаются только в контейнерах. Код примонтирован в контейнеры, поэтому правки видны сразу.
- На macOS события файловой системы не доходят до контейнеров, поэтому Vite и uvicorn следят за файлами опросом (`VITE_USE_POLLING`, `WATCHFILES_FORCE_POLLING` в `.env`).
- `frontend/src/api/schema.d.ts` генерируется (`make gen-types`) и лежит в git, чтобы проверка типов работала без запущенного бэкенда.

## SEO и рендеринг

Сейчас SPA, мета-теги через react-helmet-async из API. Для продакшена рассмотреть пререндер (Vite SSR / vite-plugin-ssr) или переезд на Next.js: поисковики и превью в мессенджерах плохо читают SPA. Модель данных и API от этого выбора не зависят.

## Деплой (Railway)

Схема: браузер → прокси Railway → сервис `frontend` (Caddy: статика + `/api/*`) → сервис `backend` по приватной сети → Postgres и S3.

- **У бэкенда нет публичного домена.** uvicorn запущен с `--proxy-headers --forwarded-allow-ips='*'` и верит заголовкам `X-Forwarded-*` от любого источника. Если открыть бэкенд наружу, любой клиент сможет подставить себе чужой IP и обойти лимиты на вход и заявки. Бэкенд доступен только через Caddy по приватному адресу `backend.railway.internal`.
- **Один origin для браузера.** Сайт, будущая админка (`/admin`) и API открываются с домена фронтенда, Caddy проксирует `/api/*`. Поэтому refresh-cookie админки (`SameSite=Strict`, путь `/api/v1/admin/auth`) работает на `*.up.railway.app` и на собственном домене без изменений. Домены `*.up.railway.app` — публичный суффикс, cookie между двумя такими доменами не делится вообще, поэтому вариант «фронт и API на разных доменах Railway» не работает.
- **IP клиента.** Прокси Railway передаёт адрес клиента в `X-Forwarded-For`. Caddy должен доверять прокси Railway (`trusted_proxies`) и отдавать бэкенду один адрес клиента, иначе бэкенд видит адрес прокси и считает всех посетителей одним клиентом. Правка Caddyfile ждёт согласования. После деплоя проверить: в логе бэкенда в строках запросов должен быть реальный IP, а не адрес из приватной сети.
- **Адрес, который слушает бэкенд (открытый вопрос).** В `backend/Dockerfile` стоит `--host ::`. asyncio для `::` включает режим «только IPv6», и по IPv4 бэкенд недоступен: локально Caddy получает отказ в соединении. Приватная сеть Railway раньше была только IPv6, поэтому на Railway это может работать, но проверка здоровья и IPv4-соединения не пройдут. Правка Dockerfile ждёт согласования.
- **Переменные окружения бэкенда:** `APP_ENV=production`, `JWT_SECRET` и `LEAD_IP_SALT` длиной от 32 символов. Вне `dev` приложение со слабыми значениями не стартует.
- **Если API когда-нибудь понадобится на отдельном поддомене** (`api.megasmart.kz` + `admin.megasmart.kz`): общий родительский домен, cookie с `Domain=megasmart.kz` и `SameSite=Lax`, CORS с `credentials`, проверка заголовка `Origin` на `/auth/refresh`, и обязательно сузить `--forwarded-allow-ips` до адресов прокси.

## Админка (задел)

- `/api/v1/admin/*`, зависимость `require_admin` (JWT).
- Образец CRUD для `project` и `media`. У всех сущностей одинаковая схема слоёв, остальные CRUD добавляются по шаблону.
- Загрузка картинок: `POST /admin/media/upload-url` → presigned PUT в S3 + запись в `media`. Подробнее в `docs/admin-roadmap.md` (этап 8).

## Этапы

0. План, `CLAUDE.md`, документация. ✅
1. Инфраструктура: docker-compose, скелеты backend/frontend, `.env.example`, Makefile, health-check. ✅
2. Backend: модели и миграции, `StorageService`, схемы секций, репозитории и сервисы. ✅
3. Backend: публичное API, разворачивание ссылок, локализация, тесты. ✅
4. Сиды: картинки в MinIO и весь тестовый контент. ✅
5. Frontend: токены, UI-кит, шапка, футер, роутинг с локалью, API-клиент, `PageRenderer`. ✅
6. Frontend: секции и страницы, начиная с главной. ✅
7. Полировка: анимации, адаптив, скелетоны, 404, SEO, Lighthouse ≥ 90. Частично: скелетоны, 404, SEO-мета и адаптив сделаны; осталось разбить бандл на чанки (сейчас 200 КБ gzip) и замерить Lighthouse.
8. Задел админки: JWT, CRUD-образец, presigned upload, `docs/admin-roadmap.md`.
