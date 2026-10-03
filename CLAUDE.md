# MegaSmart — правила проекта

Корпоративный сайт-лендинг холдинга MegaSmart (Шымкент). Сейчас этап прототипа на тестовом контенте, но архитектура сразу production-grade: следующим шагом добавится админка (CMS) без переписывания фронта и модели данных.

Исходное ТЗ: `megasmart_claude_code_prompt.md`. Модель контента: `docs/content-model.md`. Дизайн: `docs/design.md`. Архитектура и этапы: `docs/architecture.md`.

## Главное правило

**Во фронтенде нет контентных текстов и картинок.** Все тексты приходят из PostgreSQL через API, все изображения лежат в S3 (локально MinIO) и приходят как объекты `Media`. Во фронте допустимы только UI-строки (кнопки, aria-label), и они лежат в i18n-файлах (`frontend/src/i18n/`), а не в JSX.

Если сомневаешься между «быстро» и «правильно для будущей CMS», выбирай второе и коротко объясни почему.

## Стек (не менять без согласования)

- **Frontend:** Vite, React 18, TypeScript strict, Tailwind (токены через CSS-переменные), Framer Motion, React Router v6 (data routers), TanStack Query, react-i18next, react-helmet-async, openapi-typescript, ESLint + Prettier. Шрифты self-hosted через `@fontsource`.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 async + asyncpg, Alembic, aioboto3, pydantic-settings, ruff, mypy, pytest + httpx. Зависимости через uv.
- **Infra:** docker-compose (postgres, minio, minio-init, backend, frontend), `.env` и `.env.example`, Makefile.

Node.js локально не установлен, весь фронтенд-тулинг запускается в контейнере `frontend`.

## Архитектура

- Монорепозиторий: `frontend/`, `backend/`, `infra/`, `docs/`.
- Backend по слоям: `api/routers` → `services` → `repositories` → `models`. Pydantic-схемы в `schemas/`. В роутерах нет бизнес-логики.
- Страница состоит из упорядоченных секций. `section.data` (JSONB) всегда валидируется Pydantic-схемой по типу секции (discriminated union). Секции хранят ссылки (`project_ids`, `media_id`), API разворачивает их, и фронт получает страницу одним запросом.
- Локализованные поля имеют тип `LocalizedText`: JSONB `{"ru": "...", "kk": "...", "en": "..."}`. API принимает `?locale=` и отдаёт готовые строки с fallback на `ru`.
- Все таблицы: UUID-ключи, `created_at`, `updated_at`. У публикуемых сущностей есть `is_published`.
- Фронт: `sectionRegistry` + `<PageRenderer>`. Неизвестный тип секции не роняет страницу, в dev выводится предупреждение.
- Картинки выводятся только через `<SmartImage>` (ширина и высота из API, placeholder, lazy, `alt` из CMS). URL строится через `buildImageUrl()`, это задел под image-proxy.
- Типы ответов API генерируются из OpenAPI (`make gen-types`). Руками не дублировать.

## Команды

```
make up         # поднять все контейнеры
make down       # остановить
make migrate    # alembic upgrade head
make seed       # картинки в MinIO + тестовый контент (идемпотентно)
make lint       # ruff + mypy + eslint + tsc
make test       # pytest (+ тесты фронта, когда появятся)
make gen-types  # OpenAPI → frontend/src/api/schema.d.ts
```

## Качество

- TypeScript без `any`. Python с type hints везде, mypy без ошибок.
- Секреты только в `.env`, в git попадает только `.env.example`.
- Компоненты небольшие, общие паттерны выносятся в UI-кит (`src/components/ui`).
- Уважать `prefers-reduced-motion`, контраст AA, навигацию с клавиатуры, адаптив 375–1920.

## Контент

- Не придумывать факты о реальных людях и компаниях. Только явные плейсхолдеры.
- Непроверенные данные в сидах помечать `# TODO: подтвердить у Романа`.
- Токенизация: никаких выдуманных доходностей, цифр и юрисдикций. Дисклеймер редактируется из CMS.

## Порядок работы

Работаем поэтапно (этапы перечислены в `docs/architecture.md`). В конце каждого этапа: линтер, типы, тесты, коммит с понятным сообщением и короткий отчёт: что сделано, как проверить, что осталось, вопросы к бизнесу (Роману) и к техлиду.
