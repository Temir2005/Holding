# Этап 3 — дополнение к брифу

Основной бриф — `design/stage-2-brief.md` (обязателен, все правила в силе). Посмотри, как уже сделана главная: `frontend/src/sections/{Hero,Stats,Timeline,Quote,DivisionsGrid,ProjectsShowcase,ClientsMarquee,Cta,ContactForm}Section.tsx`, `sections/showcase/*`, `sections/timeline/*`, `sections/divisions/*`, `components/layout/*`. Это эталон качества и языка. Подход по возможности переиспользуй, но не копируй вслепую.

## Новое с этапа 2
- **Линия: основной путь и отводы.** `Section` принимает `trace` (основной путь — всегда вертикаль от `(x, 0)` до `(x, h)`) и `branches` (короткие штрихи `{ d, at }`, каждый рисуется, когда перо доходит до высоты `at`). Отводы НЕ клади в `d` основного пути: линия начнёт отставать от пера. Подробно — в `docs/design-system.md`, раздел «Линия: якоря и отводы».
- **Якоря** `data-trace-anchor` меряются по раскладке, `transform` анимаций их не сбивает.
- **Штампы** («Лист / Листов») всегда показывают страницу сайта: `usePageSheet()` из `components/layout/usePageSheet.ts`. Номер блока стоит только в eyebrow («03 / 09», это делает `SectionHeader`).
- **Пустые данные** (год, площадь, дата) не выводятся вовсе — ни прочерков, ни пустых подписей. В таблице допустима пустая ячейка ради выравнивания колонок.
- **Вложенность** для кадров с раскрытием: `Frame` → `ClipReveal` → `SmartImage`, иначе метки обреза срезаются.
- Живые страницы с данными сидов: `/ru/development`, `/ru/smart-panels`, `/ru/projects`, `/ru/team`, `/ru/clients`, страницы проектов `/ru/projects/<slug>` (slug-и: `aaag`, `birlik`, `zhk-proekt-a`, `bc-proekt-b`, `zavod-smart-panels`, `zhk-proekt-c`, `logistika-proekt-d`).
- Фикстуры твоих блоков — заготовки в `frontend/src/dev/sectionFixtures/<имя>.ts`, они уже подключены в `all.ts`, его не трогай. Тип блока для стенда — как в `registry.ts`.
- Прототип «полного цикла» как закреплённой сцены (v4): `design/concepts/chertezh/` (`motion.js`, `style.css`, `README.md`) и кадры `shots/scene-*.png`. Механика для React уже есть: `components/motion/usePinnedSteps.ts` (`pinnedHeight`, `STEP_SVH`).
