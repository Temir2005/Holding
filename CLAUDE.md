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

## Git — только с разрешения

- Без явного разрешения в чате запрещены: `git add`, `commit`, `push`, `pull`, `fetch`, `merge`, `rebase`, `reset`, `checkout`/`switch`, `branch`, `stash`, `tag`, `restore`, `clean`, правки `.gitignore` и git-конфига, любые команды `gh`.
- Разрешено только чтение: `git status`, `git diff`, `git log`.
- Разрешение действует на одно конкретное действие.
- В конце этапа не коммитить: описать изменения и предложить текст коммита.

## Большие изменения — только после согласования

Остановиться, описать что и зачем, предложить варианты и дождаться «да», прежде чем:
- менять архитектуру, слои или структуру папок;
- добавлять, удалять или заменять зависимости;
- создавать миграции, которые удаляют или переименовывают колонки и таблицы, либо меняют схему сверх согласованного плана;
- менять существующие ответы публичного API (`/settings`, `/pages/{slug}`, `/projects`, `/people`, `/clients`, `/vacancies`, `/leads`): на них работает фронтенд;
- трогать `frontend/` (кроме `make gen-types`, и то с разрешения);
- менять `infra/docker-compose.yml`, `Makefile`, `.env.example`, `railway.json`, Dockerfile;
- удалять файлы или переписывать существующий файл больше чем наполовину.

Ещё:
- Не выполнять `make reset`, `docker compose down -v`, сброс БД и удаление объектов из бакета без разрешения.
- Не читать и не выводить в чат секреты из `.env`.
- Python и Node запускаются только в контейнерах (`make lint`, `make test`, `make migrate`).
- Не знаешь или видишь противоречие — спроси.
- Отвечать по-русски; код, имена и комментарии в коде — на английском.

## Порядок работы

Работаем поэтапно. В конце каждого этапа: `make lint`, `make test`, короткий отчёт (что сделано, как проверить, какие миграции добавлены, предлагаемый текст коммита, вопросы) и стоп до подтверждения. Коммит делает человек.
