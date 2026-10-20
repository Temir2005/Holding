# Этап 2 — бриф для блоков главной (система «Чертёж»)

Ты переделываешь блоки (секции CMS) публичного сайта MegaSmart под новую дизайн-систему. Репозиторий: `/Users/temirlanyedil/Downloads/HoldingProject`. Прочитай `CLAUDE.md` и следуй ему:
- git только на чтение;
- Node — только в контейнере `frontend`: `docker compose -f infra/docker-compose.yml --env-file .env exec -T frontend …`;
- отвечать по-русски, код и комментарии на английском.

## Сначала прочитай
1. `docs/design-system.md` — токены, компоненты, правила.
2. Прототип, одобренный заказчиком: `design/concepts/chertezh/` (`README.md`, `style.css`, `motion.js`), кадры в `shots/`. Это эталон языка: лист, поле с красной линией, размерные линии, метки обреза, моно-подписи, ритм.
3. Компоненты: `frontend/src/components/ui/*`, `components/trace/*`, `components/motion/*`, а также `/ru/dev/design` (http://localhost:5173/ru/dev/design).
4. Свой текущий файл секции в `frontend/src/sections/` и типы данных в `frontend/src/api/schema.d.ts` (`<Type>DataRead`).

## Жёсткие правила
- **Свои файлы.** Меняешь только файлы своих секций, `frontend/src/dev/sectionFixtures/<твой>.ts` и новые файлы внутри `frontend/src/sections/<имя>/` (если нужен подкомпонент).
  - **Не трогать** `components/ui/*`, `components/trace/*`, `components/motion/*`, `styles/*`, `tailwind.config.ts`, `lib/*`, `router.tsx`, `PageRenderer`, `registry.ts`, Header и Footer.
  - Если не хватает общего компонента или токена — опиши в отчёте или пришли сообщение главному (SendMessage `main`), а пока используй Tailwind-классы с существующими токенами.
- **Контент только из API**, никаких захардкоженных текстов. UI-строки — в `frontend/src/i18n/{ru,kk,en}.json`, под своим ключом верхнего уровня (например `"timeline": {…}`).
  - Правь JSON точечными вставками. Файл могут параллельно править другие: если правка не применилась, перечитай файл и повтори.
  - Все три языка обязательны.
- **Любой порядок блоков, любой тон** (`section.tone`: dark, light, accent), любое число элементов (0, 1, 3, 12), длинные тексты, три языка.
  - Нет картинки — блок не разваливается: `<SmartImage media={null}>` даёт плашку тона.
  - Нет элементов — блок схлопывается красиво или показывает одну строку пустого состояния (UI-строка из i18n). Блок не исчезает молча, если есть заголовок.
- **Линия.** Секция рендерится через `<Section tone anchor trace=…>`. Свой рисунок линии — `TracePath` из `components/trace/paths.ts`: он начинается в `(x, 0)` и заканчивается в `(x, h)`, контракт обязателен. По умолчанию — прямая.
- **Шапка блока** — `SectionHeader` (номер листа, eyebrow, заголовок, aside).
- **Числа** — только `formatNumber(value, locale)` из `lib/format` (неразрывный пробел для всех языков) или `CountUp` с этим форматтером. Статус проекта — `StatusMark`.
- **Картинки** — только `<SmartImage>` (обычно внутри `<Frame>`). Кадр первого экрана — с `priority`. Остальные — lazy, можно `ClipReveal`.
- **Движение.**
  - Каждое движение объясняет структуру или ведёт взгляд. Только transform, opacity, clip-path и pathLength.
  - При `prefers-reduced-motion` остаётся только прозрачность (`Reveal`, `ClipReveal` и `CountUp` это уже делают).
  - Никакого scroll-jacking и никаких новых зависимостей.
- **Без клише:** карточек с тенями 3×N, скруглений, glass, блобов, marquee как единственной динамики, текста поверх фото без подложки.
- **Доступность:**
  - AA-контраст на всех тонах;
  - `focus-visible` у всего интерактивного;
  - заголовки по порядку, у секции `aria-labelledby` на её `h2` (`headingId(section.id)`, смотри как сделано сейчас);
  - картинки с `alt` из CMS.
- **TypeScript без `any`.** Перед отчётом `npx tsc --noEmit`, `npx eslint . --max-warnings=0` и `npx prettier --write` на своих файлах.

## Стенд и проверка
- **Фикстура.** Заполни `frontend/src/dev/sectionFixtures/<твой>.ts`: `registerFixture('<type>', (o) => ({ id: fid(), anchor: null, type, tone: o.tone, data: {…} }))`. Помощники лежат в `index.ts`: `fid`, `text(short, long)`, `media(o)`, `many(n, fn)`. Плейсхолдеры без реальных фактов, тип данных — строго из `schema.d.ts`.
- **Стенд:** `http://localhost:5173/ru/dev/sections?type=<type>&n=0|1|3|12&long=1&tone=dark|light|accent&media=0` (и `/kk/…`). Плюс живая главная `/ru` (данные сидов).
- **Скриншоты:** `design/tools/site-shot.cjs` в Playwright-контейнере из сети хоста, иначе картинки MinIO не грузятся. Из папки `design`:
  ```
  docker run --rm --ipc=host --network host [-e REDUCED=1] -v "$PWD:/design" -v megasmart_frontend_node_modules:/app/node_modules:ro -e NODE_PATH=/app/node_modules -w /design mcr.microsoft.com/playwright:v1.64.0-noble node tools/site-shot.cjs shots-<имя> <width> '<path?query>' ...
  ```
  - Результат пиши в `design/shots-<имя>/` (временная папка, удали её перед отчётом).
  - `REDUCED=1` — финальное состояние для полностраничных снимков. Без него проверяй движение.
  - Ширины 375, 768, 1440, 1920.
  - Длинные кадры режь: `sips -c H W --cropOffset Y X in.png --out out.png` (offset не 0, минимум 1). Смотри через Read.
- **Минимум 2 круга самокритики как арт-директор:**
  - что видно первым;
  - есть ли «момент»;
  - где шаблонно, где тесно, где пусто без причины;
  - выдержит ли блок 0, 1 и 12 элементов, kk, long и любой тон.

## Отчёт (по-русски, до 400 слов)
- Что сделал по каждому блоку: композиция, движение, состояния.
- Какие i18n-ключи добавил.
- Чего не хватило в общих компонентах.
- Пути к 3–4 лучшим кропам; сами кропы перед удалением временной папки скопируй в `design/stage-2/<имя>/`.
- Результаты tsc и eslint.
