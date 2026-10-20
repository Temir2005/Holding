# Этап 1 — дизайн-система «Чертёж» (план, ждёт подтверждения прототипа v2)

Основа — концепция A «Чертёж». Из C взяты премиальность деталей и шкала этапов у проекта. Акцент (красный или янтарный) выбирается по прототипу v2.

## Бэкенд: добавочные поля (согласовано: все пять + focal_point с миграцией)

| Поле | Где | Форма (подсказка) | В ответе API |
|---|---|---|---|
| `HeroData.stat_ids` | `schemas/sections.py` | Ref на `stats`, как `StatsData.stat_ids` | `HeroDataRead.stats: list[StatRead]`, разворачивается сервисом, как у `stats` |
| `StatsData.layout` | `schemas/sections.py` | `Literal["chain", "row"]` + `labels=`, по умолчанию `chain` | то же поле |
| `ProjectsShowcaseData.layout` | `schemas/sections.py` | `Literal["register", "sheet"]` + `labels=`: реестр (ведомость) или «лист проекта» | то же поле |
| `SiteSettingsDoc.header_cta` | `schemas/site.py` | `Cta \| None` | `SiteSettingsRead.header_cta` |
| `Media.focal_point_x/_y` | модель `Media` + миграция (2 nullable float-колонки) | два числа 0–1 в форме медиа | `MediaRead.focal_point: {x, y} \| null` → `object-position` в `<SmartImage>` |

| `ProductionData.swatches` (**ждёт «да»**) | `schemas/sections.py` | `list[Swatch]`, тот же `Swatch`, что у hero | `ProductionDataRead.swatches`. Образцы RAL переезжают из hero в блок производства (решение от 21.10) |

Фото этапов цикла новых полей не требуют: в схеме уже есть `ProcessStep.media_id`, а в ответе — `steps[].media`. Без фото сцена рисует фрагмент чертежа.

`HeroData.swatches` из схемы не удаляем: удаление поля меняло бы контракт API и требовало бы отдельного согласования.
- В новом дизайне hero это поле не выводит. В форме у поля появится пометка: «В новом дизайне не выводится, образцы задаются в блоке „Производство“».
- В сидах образцы переносятся в секцию `production` страницы Smart Panels.

Правила:
- Все поля добавочные. Старые ответы не меняются, к ним только добавляются ключи.
- Фронт-фолбэки:
  - `focal_point = null` → центр;
  - `stats` в hero пустые → hero без цифр.
- Миграции только добавляют колонки. Ничего не удаляется и не переименовывается.
- После изменений: `make migrate`, `make gen-types`, pytest на схемы и разворачивание `stats` в hero.

## Шрифты (согласовано: свои урезанные файлы + OFL)
- `frontend/scripts/build-fonts.sh` — одноразовый контейнер `python:3.12-slim` + fonttools. Источник — woff2 из пакетов fontsource, результат — `frontend/src/assets/fonts/`:
  - **Geologica:** инстанс со SHRP=60, CRSV=0, slnt=0, ось wght 200–700; subsets latin, cyrillic, cyrillic-ext.
    - Замер: 24.9 + 16.2 + 11.6 = **52.7 КБ** (файл fontsource с осью SHRP — 60.6 КБ); первый экран ru — 41.1 КБ.
    - Вместе с Plex Mono 400 и 500 на первом экране ≈ 86 КБ против ≈ 146 КБ сейчас.
  - **IBM Plex Mono:** 400 и 500; те же три subset.
  - `OFL.txt` для каждой гарнитуры и `fonts.css` с `unicode-range`.
- Шрифты подключаются в `main.tsx` через `fonts.css`. Пакеты `@fontsource-variable/manrope`, `@fontsource-variable/jetbrains-mono` и `@fontsource/golos-text` удаляются. Удаление зависимостей — по этому плану.
- Проверка — `design/tools/cmap.cjs` по готовым файлам: все казахские буквы на месте. Заодно это чинит kk-версию (аудит, п. 1).
- Preload только одного файла — Geologica latin+cyrillic для hero.

## Токены (`src/styles/tokens.css` + `tailwind.config.ts`)
- **Палитра:** бумага, чернила, графит (тёмные секции по v2), линии, акцент. Семантика по тонам, как сейчас: `--surface`, `--tile`, `--fg`, `--fg-mute`, `--line`, `--accent`, `--accent-ink`, `--on-accent`, и новый `--trace` — цвет линии на тоне.
- **Типографика:** display, h2, h3, stat-hero, stat, lead, body, caption, mono-label (clamp-шкала из прототипа v2).
- **Сетка и отступы:** `--gutter`, `--trace-x` (поле линии), ритм секций (3 ступени плотности), колонки 4 / 8 / 12.
- **Радиусы:** 0 и 2 px. **Тени:** нет, вместо них волосяные линии.
- **z-index:** base, sticky, header, menu, toast.
- **Движение:** длительности 150 / 300 / 700 / 1100 мс, кривые `--ease-out` (0.2, 0.7, 0.2, 1) и `--ease-in-out`. Позиция пера `--pen: 78%`.
- Правки `globals.css` минимальные. **Проверка, что админку это не задело:** до и после — e2e-скриншоты админки (`layout.spec`, `sweep.spec`) и сравнение. Админка импортирует `globals.css` через `main.tsx`, а `h1–h3` и `body` там глобальные.

## Компоненты (`src/components/ui` и `src/components/trace`)
- `Container`, `Section`:
  - `Section` получает `trace` — вход и выход линии в поле `--trace-x`.
  - Режим по умолчанию — прямой отрезок. Блок может передать свой путь.
- `Heading` (display / h2 / h3), `Eyebrow`:
  - номер секции «02 / 04» берётся из `PageRenderer` через контекст: индекс и общее число;
  - если нумерация выключена, номера нет.
- `Button`: primary / secondary, стрелка-размерная линия при hover. `Link`: «чертящееся» подчёркивание. `Tag` / `StatusChip`.
- `DimensionLine` — |←→| с подписью.
- `PinnedSteps` — механика сцены «полного цикла» (для `process_steps`, переиспользуемая):
  - секция высотой N × 100svh, внутри `sticky` на 100svh;
  - активный этап = floor(progress × N) из `useScroll` секции. Нативная прокрутка, без snap и scroll-jacking;
  - при N ≤ 1 и `prefers-reduced-motion` — обычный список.
- `SmartImage`-варианты:
  - `Frame` — метки обреза;
  - `focal_point` → `object-position`;
  - плейсхолдер в виде штриховки на тоне.
- **Правило LCP:** `h1` в hero не анимируется и не скрывается никогда. Движение получают только линия, рамка кадра, метки и горизонт (решение от 21.10).
- Reveal-примитивы на Framer Motion: `MaskLines` (построчный подъём), `ClipReveal`, `CountUp` (табличные цифры, без сдвига).
- `Trace`:
  - сегмент секции — SVG-путь с `pathLength`, которым управляет `useScroll({ target, offset: ['start var(--pen)', 'end var(--pen)'] })`;
  - офсеты кэшируются в Framer Motion, работа в кадре только на compositor;
  - Reduced motion: `pathLength = 1` сразу.
- Все UI-строки (подписи этапов цикла, «Этап», «Лист») — в `src/i18n/{ru,kk,en}.json`.

## Dev-страница `/dev/design`
- Ленивый маршрут только при `import.meta.env.DEV`, в продакшен-сборку не попадает (проверка: в `dist` нет чанка).
- Все токены, шкалы и компоненты на трёх тонах.
- Стенд линии: несколько секций в случайном порядке с кнопкой «перемешать». Наглядная проверка контракта входа и выхода.

## Проверка в конце этапа
- `make lint`, `make test`, `make gen-types` — без расхождений.
- `site-shots.spec.ts`: в `WIDTHS` добавить 768 и 1920, в страницы — `/ru/dev/design`. Скриншоты 375 / 768 / 1440 / 1920.
- Скриншоты админки до и после — без визуальных изменений.
- Бандл: замер `vite build` до и после.
- Отчёт, текст коммита, стоп.

## Перенесено на следующие этапы
- **Этап 2, подвал-штамп.** «Листов» — число страниц в ведомости, «Лист» — номер текущей страницы. Оба считаются из `settings.navigation`, не зашиваются. В прототипе v4 ведомость была на 7 листов, а в штампе стояло «06» — это ошибка прототипа.
- **Этап 2, hero.** Кадр первого экрана — `<SmartImage priority>` без reveal-анимации: в прототипе на 375 он проявлялся через 1–2 с. Движение есть только у рамки и меток.
- **Этап 5, формат чисел на kk.** Сейчас `formatNumber` для `kk` даёт «30,000» с запятой; нужен пробел, как в `ru`. Ошибка была и до редизайна.
- **Админка, нужна правка с разрешения.** В `frontend/src/admin/features/media/MediaCard.tsx` функция `formValues()` не передаёт `focal_point_x/y`, поэтому сохранение карточки медиа затирает фокус. Правка в одну строку.
