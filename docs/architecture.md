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

## SEO и рендеринг

Сейчас SPA, мета-теги через react-helmet-async из API. Для продакшена рассмотреть пререндер (Vite SSR / vite-plugin-ssr) или переезд на Next.js: поисковики и превью в мессенджерах плохо читают SPA. Модель данных и API от этого выбора не зависят.

## Админка (задел)

- `/api/v1/admin/*`, зависимость `require_admin` (JWT).
- Образец CRUD для `project` и `media`. У всех сущностей одинаковая схема слоёв, остальные CRUD добавляются по шаблону.
- Загрузка картинок: `POST /admin/media/upload-url` → presigned PUT в S3 + запись в `media`. Подробнее в `docs/admin-roadmap.md` (этап 8).

## Этапы

0. План, `CLAUDE.md`, документация — **этот этап**.
1. Инфраструктура: docker-compose, скелеты backend/frontend, `.env.example`, Makefile, health-check.
2. Backend: модели и миграции, `StorageService`, схемы секций, репозитории и сервисы.
3. Backend: публичное API, разворачивание ссылок, локализация, тесты.
4. Сиды: картинки в MinIO и весь тестовый контент.
5. Frontend: токены, UI-кит, шапка, футер, роутинг с локалью, API-клиент, `PageRenderer`.
6. Frontend: секции и страницы, начиная с главной.
7. Полировка: анимации, адаптив, скелетоны, 404, SEO, Lighthouse ≥ 90.
8. Задел админки: JWT, CRUD-образец, presigned upload, `docs/admin-roadmap.md`.
