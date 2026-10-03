"""Test content in Russian.

Facts come from open sources and the brief; everything unverified is marked
`TODO: подтвердить у Романа`. Names of people and client companies are explicit
placeholders: no invented facts about real people or companies.
"""

import uuid
from decimal import Decimal
from typing import Any

from app.models import (
    Client,
    Division,
    EmploymentType,
    Person,
    Project,
    ProjectStatus,
    SiteSettings,
    Stat,
    TimelineEvent,
    Vacancy,
)
from seed import images as img
from seed.seeder import L, Seeder, uid

CONTACT_FORM_CONSENT = (
    "Отправляя форму, вы соглашаетесь на обработку персональных данных. "
    "Мы используем их только для ответа на заявку."
)


def contact_form(title: str, text: str, types: list[str], default: str) -> dict[str, Any]:
    return {
        "type": "contact_form",
        "anchor": "contacts",
        "tone": "light",
        "eyebrow": L("Контакты"),
        "title": L(title),
        "text": L(text),
        "lead_types": types,
        "default_type": default,
        "consent_text": L(CONTACT_FORM_CONSENT),
        "success_text": L("Заявка отправлена. Мы свяжемся с вами в течение рабочего дня."),
    }


def cta(label: str, href: str, variant: str = "primary") -> dict[str, Any]:
    return {"label": L(label), "href": href, "variant": variant}


def ids(values: list[uuid.UUID]) -> list[str]:
    return [str(v) for v in values]


SWATCHES = [
    ("RAL 7016", "Антрацит · глянец", "#3B3F42", "gloss"),
    ("LAB 58/24/32", "Медь", "#C77B4E", "matte"),
    ("TX-04", "Дуб, текстура", "#D9D0C1", "texture"),
    ("RAL 9010", "Белый · FOG", "#F1EEE8", "matte"),
    ("RAL 6003", "Олива · глянец", "#56624F", "gloss"),
    ("RAL 9005", "Чёрный мат", "#2A2B2D", "matte"),
]


async def seed_all(s: Seeder) -> None:
    # ------------------------------------------------------------------ media
    m_hero = await s.media("hero-skyline", img.skyline("hero"), "Вечерний город: жилые башни")
    m_hero_dev = await s.media(
        "hero-construction", img.construction("dev"), "Строительная площадка"
    )
    m_hero_sp = await s.media(
        "hero-production", img.production("sp"), "Цех производства МДФ-панелей"
    )
    m_hero_alatau = await s.media(
        "hero-alatau", img.skyline("alatau", dusk=False), "Концепция застройки Alatau City"
    )
    m_office = await s.media("office", img.office("office"), "Офис MegaSmart")
    m_office2 = await s.media("office-2", img.office("office-2"), "Переговорная")
    prod = [
        await s.media(f"production-{i}", img.production(f"p{i}"), "Производственная линия")
        for i in range(4)
    ]
    swatch_media = {
        code: await s.media(
            f"swatch-{code.lower().replace(' ', '-').replace('/', '-')}",
            img.swatch(code, color, finish),
            f"Образец панели {label}",
        )
        for code, label, color, finish in SWATCHES
    }
    renders = [
        await s.media(
            f"render-{i}", img.skyline(f"render-{i}", dusk=i % 2 == 0), "Визуализация проекта"
        )
        for i in range(8)
    ]
    sites = [
        await s.media(f"site-{i}", img.construction(f"site-{i}"), "Ход строительства")
        for i in range(4)
    ]

    # -------------------------------------------------------------- divisions
    d_dev = await s.upsert(
        Division,
        "division:development",
        slug="development",
        name=L("MegaSmart Development"),
        tagline=L("Полный цикл: от участка до сдачи объекта"),
        description=L(
            "Ищем землю, проектируем, производим материалы на собственном заводе, "
            "строим и сопровождаем объект после сдачи."
        ),
        cover_id=m_hero_dev,
        stats=[
            {
                "value": 12,
                "suffix": L(""),
                "label": L("объектов в работе"),
            },  # TODO: подтвердить у Романа
        ],
        page_slug="development",
        sort_order=10,
    )
    d_sp = await s.upsert(
        Division,
        "division:smart-panels",
        slug="smart-panels",
        name=L("Smart Panels 2011"),
        tagline=L("МДФ-панели и фасады для мебельщиков и дилеров"),
        description=L(
            "Матовые, глянцевые и текстурные панели, покраска по RAL и LAB, "
            "покрытие FOG против отпечатков. Отгрузка со склада за 2 дня."
        ),
        cover_id=m_hero_sp,
        stats=[
            {"value": 30000, "suffix": L("м²"), "label": L("производственных мощностей")},
            {"value": 30, "suffix": L("+"), "label": L("дилеров в РК и СНГ")},
        ],
        website_url="https://smartpanels.kz",
        page_slug="smart-panels",
        sort_order=20,
    )
    d_new = await s.upsert(
        Division,
        "division:new-projects",
        slug="new-projects",
        name=L("Новые проекты"),
        tagline=L("AAAG, Birlik и другие проекты в Alatau City"),
        description=L(
            "Участие в строительстве Alatau City и пилот токенизации недвижимости. "
            "Детали проектов будут опубликованы позже."  # TODO: подтвердить у Романа
        ),
        cover_id=m_hero_alatau,
        stats=[],
        page_slug="projects",
        sort_order=30,
    )

    # ---------------------------------------------------------------- projects
    project_specs: list[dict[str, Any]] = [
        dict(
            slug="aaag",
            title="AAAG",
            division_id=d_new,
            status=ProjectStatus.planned,
            location="Alatau City",
            year=None,
            area=None,
            featured=True,
            tokenized=True,
            short="Многофункциональный комплекс в Alatau City. Описание — плейсхолдер.",
            tags=["Alatau City", "жильё"],
        ),
        dict(
            slug="birlik",
            title="Birlik",
            division_id=d_new,
            status=ProjectStatus.in_progress,
            location="Alatau City",
            year=None,
            area=None,
            featured=True,
            tokenized=True,
            short="Жилой квартал в Alatau City. Описание — плейсхолдер.",
            tags=["Alatau City", "жильё"],
        ),
        dict(
            slug="zhk-proekt-a",
            title="ЖК «Проект A»",
            division_id=d_dev,
            status=ProjectStatus.completed,
            location="Шымкент",
            year=2021,
            area=Decimal(18500),
            featured=True,
            tokenized=False,
            short="Жилой комплекс комфорт-класса. Название и цифры — тестовые.",
            tags=["жильё"],
        ),
        dict(
            slug="bc-proekt-b",
            title="Бизнес-центр «Проект B»",
            division_id=d_dev,
            status=ProjectStatus.completed,
            location="Шымкент",
            year=2019,
            area=Decimal(9200),
            featured=False,
            tokenized=False,
            short="Офисное здание класса B+. Название и цифры — тестовые.",
            tags=["коммерция"],
        ),
        dict(
            slug="zavod-smart-panels",
            title="Завод Smart Panels",
            division_id=d_sp,
            status=ProjectStatus.completed,
            location="Шымкент, промзона Тассай",
            year=2015,
            area=Decimal(30000),
            featured=True,
            tokenized=False,
            short="Производство МДФ-плит по южнокорейской технологии.",
            tags=["производство"],
        ),
        dict(
            slug="zhk-proekt-c",
            title="ЖК «Проект C»",
            division_id=d_dev,
            status=ProjectStatus.in_progress,
            location="Шымкент",
            year=2026,
            area=Decimal(24000),
            featured=False,
            tokenized=False,
            short="Жилой квартал с дворами без машин. Название и цифры — тестовые.",
            tags=["жильё"],
        ),
        dict(
            slug="logistika-proekt-d",
            title="Логистический центр «Проект D»",
            division_id=d_dev,
            status=ProjectStatus.planned,
            location="Шымкентская область",
            year=None,
            area=Decimal(12000),
            featured=False,
            tokenized=False,
            short="Склад и логистика для дилерской сети. Название и цифры — тестовые.",
            tags=["коммерция", "логистика"],
        ),
    ]
    project_ids: dict[str, uuid.UUID] = {}
    for i, p in enumerate(project_specs):
        pid = await s.upsert(
            Project,
            f"project:{p['slug']}",
            slug=p["slug"],
            title=L(p["title"]),
            division_id=p["division_id"],
            status=p["status"],
            location=L(p["location"]),
            year=p["year"],
            area_m2=p["area"],
            short_description=L(p["short"]),
            body=L(
                f"## О проекте\n\n{p['short']}\n\n"
                "Здесь будет подробное описание: концепция, архитектура, инженерные решения "
                "и сроки. Текст редактируется из админки.\n\n"
                "## Характеристики\n\n- Площадь, этажность и сроки — после подтверждения\n"
                "- Материалы отделки — собственное производство Smart Panels"
            ),
            cover_id=renders[i % len(renders)],
            tags=p["tags"],
            is_featured=p["featured"],
            is_tokenized=p["tokenized"],
            sort_order=i * 10,
        )
        project_ids[p["slug"]] = pid
        await s.gallery(
            pid, [renders[(i + 1) % 8], sites[i % 4], renders[(i + 3) % 8], sites[(i + 1) % 4]]
        )

    # ------------------------------------------------------------------ people
    founder = await s.upsert(
        Person,
        "person:founder",
        full_name=L("Сергей Хегай"),
        position=L("Основатель холдинга MegaSmart"),
        bio=L(
            "Биография основателя — плейсхолдер. Здесь будет история пути от мебельного цеха "
            "до холдинга полного цикла."  # TODO: подтвердить у Романа
        ),
        photo_id=await s.media("person-founder", img.portrait("founder"), "Сергей Хегай"),
        is_key=True,
        is_founder=True,
        sort_order=0,
    )
    team = [
        ("ceo", "Генеральный директор", None, True),
        ("cfo", "Финансовый директор", None, True),
        ("construction", "Директор по строительству", d_dev, True),
        ("engineer", "Главный инженер", d_dev, True),
        ("architect", "Главный архитектор", d_dev, True),
        ("production", "Директор производства", d_sp, True),
        ("hr", "HR-директор", None, False),
        ("sales", "Руководитель отдела продаж", d_sp, False),
        ("pm", "Руководитель проектов", d_dev, False),
        ("quality", "Инженер по качеству", d_sp, False),
        ("marketing", "Маркетолог", None, False),
    ]
    for i, (key, position, division_id, is_key) in enumerate(team, start=1):
        await s.upsert(
            Person,
            f"person:{key}",
            full_name=L("Имя Фамилия"),
            position=L(position),
            division_id=division_id,
            bio=L(
                "Короткая биография — плейсхолдер: опыт, зона ответственности, ключевые проекты."
            ),
            photo_id=await s.media(f"person-{key}", img.portrait(key), f"Фото: {position}"),
            is_key=is_key,
            sort_order=i * 10,
        )

    # ----------------------------------------------------------------- clients
    industries = {
        "furniture": "Мебельное производство",
        "construction": "Строительство",
        "design": "Дизайн интерьеров",
        "dealer": "Дилеры",
        "retail": "Ритейл",
    }
    client_specs = [
        ("Компания Альфа", "furniture"),
        ("Компания Бета", "construction"),
        ("Компания Гамма", "dealer"),
        ("Компания Дельта", "design"),
        ("Компания Эпсилон", "furniture"),
        ("Компания Зета", "retail"),
        ("Компания Эта", "construction"),
        ("Компания Тета", "dealer"),
        ("Компания Йота", "furniture"),
        ("Компания Каппа", "design"),
        ("Компания Лямбда", "dealer"),
        ("Компания Мю", "construction"),
        ("Компания Ню", "retail"),
        ("Компания Кси", "furniture"),
    ]
    for i, (name, industry) in enumerate(client_specs):
        testimonial = (
            {
                "quote": L(
                    "Отзыв клиента — плейсхолдер. Здесь будет короткая история сотрудничества "
                    "и конкретный результат."
                ),
                "author": L("Имя Фамилия"),
                "position": L(f"Директор, {name}"),
            }
            if i % 4 == 0
            else None
        )
        await s.upsert(
            Client,
            f"client:{i}",
            name=L(f"{name} (тест)"),
            logo_id=await s.media(
                f"client-{i}", img.logo_svg(name, f"client-{i}"), f"Логотип {name}"
            ),
            industry=industry,
            industry_label=L(industries[industry]),
            description=L("Тестовый клиент. Реальные клиенты появятся после согласования."),
            testimonial=testimonial,
            sort_order=i * 10,
        )

    # ---------------------------------------------------------------- timeline
    timeline = [
        (2004, "Сборочный цех в гараже", "Двое мастеров, первые заказы на мебель в Шымкенте."),
        (2007, "Первый мебельный магазин", "Собственная розница и прямой контакт с покупателем."),
        (
            2015,
            "Завод МДФ-плит",
            "Запуск производства по южнокорейской технологии вместе с партнёрами из Кореи.",
        ),
        (
            2017,
            "Начало экспорта",
            "Поставки в Узбекистан, Кыргызстан, Таджикистан, Россию и Беларусь.",
        ),
        (
            2024,
            "MegaSmart Development",
            "Холдинг выходит в девелопмент и проекты Alatau City.",
        ),  # TODO: подтвердить у Романа (год)
    ]
    for i, (year, title, text) in enumerate(timeline):
        await s.upsert(
            TimelineEvent,
            f"timeline:{year}",
            year=year,
            title=L(title),
            description=L(text),
            image_id=[m_office, prod[0], m_hero_sp, renders[2], m_hero_alatau][i],
            sort_order=i * 10,
        )  # TODO: подтвердить у Романа (все даты)

    # ------------------------------------------------------------------- stats
    stats: dict[str, list[tuple[int, str | None, str, str]]] = {
        "home": [
            (20, None, "+", "лет на рынке"),
            (30000, None, "м²", "производственных мощностей"),
            (30, None, "+", "дилеров в РК и СНГ"),
            (6, None, "", "стран поставок"),
            (12, None, "", "реализованных объектов"),  # TODO: подтвердить у Романа
        ],
        "development": [
            (12, None, "", "объектов в портфеле"),  # TODO: подтвердить у Романа
            (
                100,
                None,
                "%",
                "материалов отделки — своё производство",
            ),  # TODO: подтвердить у Романа
            (5, None, "", "этапов полного цикла"),
        ],
        "smart-panels": [
            (20, None, "+", "лет опыта"),
            (30000, None, "м²", "мощностей"),
            (30, None, "+", "дилеров в РК и СНГ"),
            (2, None, " дня", "отгрузка со склада"),
            (20, None, "+", "цветов и фактур"),
        ],
    }
    for context, rows in stats.items():
        for i, (value, prefix, suffix, label) in enumerate(rows):
            await s.upsert(
                Stat,
                f"stat:{context}:{i}",
                value=Decimal(value),
                prefix=prefix,
                suffix=L(suffix),
                label=L(label),
                context=context,
                sort_order=i * 10,
            )

    # --------------------------------------------------------------- vacancies
    for i, (title, division_id, kind) in enumerate(
        [
            ("Инженер ПТО", d_dev, EmploymentType.full_time),
            ("Оператор линии покраски", d_sp, EmploymentType.full_time),
            ("Стажёр-архитектор", d_dev, EmploymentType.internship),
        ]
    ):
        await s.upsert(
            Vacancy,
            f"vacancy:{i}",
            title=L(title),
            division_id=division_id,
            location=L("Шымкент"),
            employment_type=kind,
            description=L("Описание вакансии — плейсхолдер: задачи, требования, условия."),
            is_open=True,
            sort_order=i * 10,
        )

    # ----------------------------------------------------------- site settings
    await s.upsert(
        SiteSettings,
        "site_settings",
        site_name=L("MegaSmart"),
        navigation=[
            {"label": L("Холдинг"), "page_slug": "home"},
            {"label": L("Development"), "page_slug": "development"},
            {"label": L("Smart Panels"), "page_slug": "smart-panels"},
            {"label": L("Проекты"), "page_slug": "projects"},
            {"label": L("Команда"), "page_slug": "team"},
            {"label": L("Клиенты"), "page_slug": "clients"},
            {"label": L("Контакты"), "anchor": "contacts"},
        ],
        contacts={
            "address": L("Шымкент, промзона Тассай, 697А"),
            "phones": ["+7 777 105 00 44"],
            "email": "sales@megasmart.kz",
            "whatsapp": "+77771050044",
            "hours": L("Пн–Пт, 9:00–18:00"),  # TODO: подтвердить у Романа
            "coordinates": {"lat": 42.3417, "lng": 69.5901},  # TODO: подтвердить у Романа
        },
        socials=[
            {"type": "instagram", "url": "https://instagram.com/"},  # TODO: подтвердить у Романа
            {"type": "telegram", "url": "https://t.me/"},
            {"type": "whatsapp", "url": "https://wa.me/77771050044"},
        ],
        footer={
            "text": L(
                "Холдинг полного цикла: производство материалов, проектирование и строительство."
            ),
            "legal": L("© MegaSmart. Тестовый контент, данные требуют подтверждения."),
        },
        default_seo={
            "title": L("MegaSmart — холдинг полного цикла"),
            "description": L("Производство МДФ-панелей, девелопмент и проекты в Alatau City."),
            "og_image_id": str(m_hero),
        },
    )

    # ------------------------------------------------------------------- pages
    swatches = [
        {"code": c, "label": L(label), "color": color, "finish": finish}
        for c, label, color, finish in SWATCHES
    ]

    await s.page(
        "home",
        title="Холдинг MegaSmart",
        seo_description="От мебельного цеха в гараже до холдинга полного цикла.",
        og_image_id=m_hero,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Холдинг MegaSmart · Шымкент · с 2004 года"),
                "title": L("Мы делаем материалы, из которых строим"),
                "subtitle": L(
                    "Двадцать лет назад начали с мебели. Сегодня производим МДФ-панели "
                    "для шести стран и строим жилые кварталы в Alatau City."
                ),
                "background_media_id": str(m_hero),
                "ctas": [
                    cta("Стать партнёром", "#contacts"),
                    cta("Смотреть проекты", "projects", "secondary"),
                ],
                "swatches": swatches,
            },
            {"type": "stats", "tone": "light", "context": "home"},
            {
                "type": "timeline",
                "eyebrow": L("История"),
                "title": L("Как мебельный цех стал холдингом"),
            },
            {
                "type": "quote",
                "tone": "light",
                "text": L(
                    "Цитата основателя — плейсхолдер. Здесь будет короткая мысль о том, "
                    "зачем мы строим и что для нас значит качество."
                ),
                "person_id": str(founder),
            },
            {
                "type": "divisions_grid",
                "eyebrow": L("Направления"),
                "title": L("Три направления, один стандарт качества"),
                "division_ids": ids([d_dev, d_sp, d_new]),
            },
            {
                "type": "projects_showcase",
                "tone": "light",
                "eyebrow": L("Проекты"),
                "title": L("Избранные объекты"),
                "featured": True,
                "link": cta("Все проекты", "projects", "secondary"),
            },
            {
                "type": "clients_marquee",
                "eyebrow": L("Нам доверяют"),
                "title": L("Клиенты и партнёры"),
            },
            {
                "type": "cta",
                "tone": "accent",
                "title": L("Инвестируйте в проекты полного цикла"),
                "text": L("Расскажем о текущих проектах, сроках и формате участия."),
                "ctas": [cta("Оставить заявку", "#contacts")],
            },
            contact_form(
                "Обсудим сотрудничество",
                "Оставьте контакты, и мы ответим в течение рабочего дня.",
                ["investor", "partner", "client"],
                "investor",
            ),
        ],
    )

    await s.page(
        "development",
        title="MegaSmart Development",
        seo_description="Девелопмент полного цикла: земля, проект, материалы, стройка, сдача.",
        sort_order=10,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("MegaSmart Development"),
                "title": L("Полный цикл в одних руках"),
                "subtitle": L(
                    "Мы не просто девелопер: сами создаём, проектируем, производим материалы, "
                    "строим и доводим объект до сдачи."
                ),
                "background_media_id": str(m_hero_dev),
                "ctas": [
                    cta("Обсудить проект", "#contacts"),
                    cta("Портфолио", "#portfolio", "secondary"),
                ],
            },
            {
                "type": "process_steps",
                "tone": "light",
                "eyebrow": L("Полный цикл"),
                "title": L("Пять этапов, ни одного подрядчика между ними"),
                "steps": [
                    {
                        "title": L("Поиск земли"),
                        "text": L(
                            "Анализ участков, юридическая проверка, градостроительные условия."
                        ),
                    },
                    {
                        "title": L("Концепция и проект"),
                        "text": L("Архитектура, инженерия и экспертиза силами своей команды."),
                    },
                    {
                        "title": L("Собственные материалы"),
                        "text": L(
                            "Панели и фасады с нашего завода Smart Panels: качество и сроки под контролем."
                        ),
                        "division_id": str(d_sp),
                    },
                    {
                        "title": L("Строительство"),
                        "text": L("Генподряд, технадзор и контроль качества на каждом этапе."),
                    },
                    {
                        "title": L("Сдача и управление"),
                        "text": L("Ввод в эксплуатацию, гарантия и управление объектом."),
                    },
                ],
            },
            {
                "type": "capabilities",
                "eyebrow": L("Преимущества"),
                "title": L("Почему с нами быстрее и надёжнее"),
                "columns": 3,
                "items": [
                    {
                        "icon": "factory",
                        "title": L("Своё производство"),
                        "text": L("Не зависим от поставщиков отделочных материалов."),
                    },
                    {
                        "icon": "ruler",
                        "title": L("Проектный офис"),
                        "text": L("Архитекторы и инженеры в штате."),
                    },
                    {
                        "icon": "shield",
                        "title": L("Контроль качества"),
                        "text": L("Каждый этап принимает служба качества."),
                    },
                    {
                        "icon": "clock",
                        "title": L("Предсказуемые сроки"),
                        "text": L("Материалы со склада за 2 дня, без простоев."),
                    },
                    {
                        "icon": "map",
                        "title": L("Знание региона"),
                        "text": L("Двадцать лет работы на юге Казахстана."),
                    },
                    {
                        "icon": "key",
                        "title": L("Сопровождение"),
                        "text": L("Гарантия и управление после сдачи."),
                    },
                ],
            },
            {"type": "stats", "tone": "light", "context": "development"},
            {
                "type": "project_list",
                "anchor": "portfolio",
                "eyebrow": L("Портфолио"),
                "title": L("Проекты"),
                "show_filter": True,
            },
            {
                "type": "team_grid",
                "tone": "light",
                "eyebrow": L("Команда"),
                "title": L("Ключевые люди направления"),
                "person_ids": ids(
                    [
                        uid("person:construction"),
                        uid("person:engineer"),
                        uid("person:architect"),
                        uid("person:pm"),
                    ]
                ),
            },
            {
                "type": "cta",
                "tone": "accent",
                "title": L("Есть участок или идея проекта?"),
                "text": L("Посмотрим участок и предложим концепцию."),
                "ctas": [cta("Оставить заявку", "#contacts")],
            },
            contact_form(
                "Обсудим ваш проект",
                "Расскажите о задаче, и мы предложим формат работы.",
                ["partner", "investor", "client"],
                "partner",
            ),
        ],
    )

    await s.page(
        "smart-panels",
        title="Smart Panels 2011",
        seo_description="МДФ-панели и фасады: матовые, глянцевые, текстурные, покраска RAL/LAB, FOG.",
        sort_order=20,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Smart Panels 2011 · производство МДФ-панелей"),
                "title": L("Панели, из которых собирают кухни шести стран"),
                "subtitle": L(
                    "Матовые, глянцевые и текстурные панели. Покраска по RAL и LAB. Отгрузка со склада за 2 дня."
                ),
                "background_media_id": str(m_hero_sp),
                "ctas": [
                    cta("Стать дилером", "#contacts"),
                    cta("smartpanels.kz", "https://smartpanels.kz", "secondary"),
                ],
                "swatches": swatches,
            },
            {
                "type": "capabilities",
                "tone": "light",
                "eyebrow": L("Продукция"),
                "title": L("Покрытия и фактуры"),
                "columns": 3,
                "items": [
                    {
                        "icon": "square",
                        "title": L("Матовые панели"),
                        "text": L("Глубокий цвет без бликов."),
                        "media_id": str(swatch_media["RAL 9005"]),
                    },
                    {
                        "icon": "sparkle",
                        "title": L("Глянцевые панели"),
                        "text": L("Зеркальный блеск и ровная поверхность."),
                        "media_id": str(swatch_media["RAL 7016"]),
                    },
                    {
                        "icon": "layers",
                        "title": L("Текстурные панели"),
                        "text": L("Фактура дерева и камня."),
                        "media_id": str(swatch_media["TX-04"]),
                    },
                    {
                        "icon": "palette",
                        "title": L("Покраска RAL / LAB"),
                        "text": L("Любой цвет из каталога или по образцу."),
                        "media_id": str(swatch_media["LAB 58/24/32"]),
                    },
                    {
                        "icon": "fingerprint",
                        "title": L("FOG-покрытие"),
                        "text": L("Не оставляет отпечатков пальцев."),
                        "media_id": str(swatch_media["RAL 9010"]),
                    },
                    {
                        "icon": "leaf",
                        "title": L("Цвета под заказ"),
                        "text": L("Более 20 цветов и фактур в наличии."),
                        "media_id": str(swatch_media["RAL 6003"]),
                    },
                ],
            },
            {
                "type": "production",
                "eyebrow": L("Производство"),
                "title": L("Корейская технология, контроль каждого листа"),
                "body": L(
                    "Завод работает по южнокорейской технологии с 2015 года. Каждый лист проходит "
                    "контроль геометрии и покрытия перед упаковкой. Минимальный заказ — одна паллета (50 листов)."
                ),
                "facts": [
                    {"value": "30 000 м²", "label": L("площадь производства")},
                    {"value": "50 листов", "label": L("минимальный заказ, 1 паллета")},
                    {"value": "2 дня", "label": L("отгрузка со склада")},
                ],
                "gallery_media_ids": ids(prod),
            },
            {"type": "stats", "tone": "light", "context": "smart-panels"},
            {
                "type": "geography",
                "eyebrow": L("География"),
                "title": L("Поставляем в шесть стран"),
                "intro": L("Дилерская сеть из 30+ партнёров в Казахстане и СНГ."),
                "countries": [
                    {"code": "KZ", "name": L("Казахстан"), "note": L("производство и склад")},
                    {"code": "UZ", "name": L("Узбекистан")},
                    {"code": "KG", "name": L("Кыргызстан")},
                    {"code": "TJ", "name": L("Таджикистан")},
                    {"code": "RU", "name": L("Россия")},
                    {"code": "BY", "name": L("Беларусь")},
                ],
            },
            {
                "type": "capabilities",
                "tone": "light",
                "eyebrow": L("Для кого"),
                "title": L("С нами работают"),
                "columns": 3,
                "items": [
                    {
                        "icon": "sofa",
                        "title": L("Мебельщики"),
                        "text": L("Фасады для кухонь, шкафов и корпусной мебели."),
                    },
                    {
                        "icon": "factory",
                        "title": L("Производства"),
                        "text": L("Стабильные партии и сроки для серийного выпуска."),
                    },
                    {
                        "icon": "pen",
                        "title": L("Дизайнеры"),
                        "text": L("Цвет по образцу и редкие фактуры."),
                    },
                    {
                        "icon": "building",
                        "title": L("Строительные компании"),
                        "text": L("Отделка для жилых и коммерческих объектов."),
                    },
                    {
                        "icon": "store",
                        "title": L("Дилеры"),
                        "text": L("Условия для партнёров в РК и СНГ."),
                    },
                ],
            },
            {
                "type": "cta",
                "tone": "accent",
                "title": L("Каталог и цены — на smartpanels.kz"),
                "text": L("Или оставьте заявку, и менеджер подберёт панели под ваш проект."),
                "ctas": [
                    cta("Перейти на smartpanels.kz", "https://smartpanels.kz"),
                    cta("Оставить заявку", "#contacts", "secondary"),
                ],
            },
            contact_form(
                "Запросить расчёт",
                "Укажите объём и покрытие, и мы пришлём предложение.",
                ["client", "partner"],
                "client",
            ),
        ],
    )

    await s.page(
        "projects",
        title="Новые проекты",
        seo_description="AAAG, Birlik и другие проекты MegaSmart в Alatau City.",
        sort_order=30,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Alatau City"),
                "title": L("Строим новый город"),
                "subtitle": L(
                    "AAAG, Birlik и другие проекты MegaSmart в Alatau City. Подробности будут опубликованы после согласования."
                ),
                "background_media_id": str(m_hero_alatau),
                "ctas": [
                    cta("Стать инвестором", "#contacts"),
                    cta("О токенизации", "#tokenization", "secondary"),
                ],
            },
            {
                "type": "about_text",
                "tone": "light",
                "eyebrow": L("Роль MegaSmart"),
                "title": L("Девелопер и производитель материалов"),
                "body": L(
                    "Текст о роли MegaSmart в Alatau City — плейсхолдер.\n\n"
                    "Здесь будет рассказ о том, какие участки и объекты ведёт холдинг, "
                    "как собственное производство сокращает сроки и почему это важно инвестору."
                ),
                "media_id": str(renders[5]),
                "layout": "media_right",
            },
            {
                "type": "project_list",
                "eyebrow": L("Проекты"),
                "title": L("Все объекты"),
                "show_filter": True,
            },
            {
                "type": "tokenization_explainer",
                "anchor": "tokenization",
                "tone": "light",
                "eyebrow": L("Токенизация недвижимости"),
                "title": L("Доля в объекте в цифровом виде"),
                "intro": L(
                    "Токенизация позволяет оформить долю в объекте недвижимости как цифровой актив. "
                    "Описание механики — плейсхолдер, детали согласуются с юристами."
                ),
                "steps": [
                    {
                        "icon": "building",
                        "title": L("Объект"),
                        "text": L("Выбираем проект и оформляем права."),
                    },
                    {
                        "icon": "split",
                        "title": L("Доли"),
                        "text": L("Объект делится на цифровые доли."),
                    },
                    {
                        "icon": "wallet",
                        "title": L("Инвестор"),
                        "text": L("Инвестор приобретает долю удобного размера."),
                    },
                    {
                        "icon": "chart",
                        "title": L("Отчётность"),
                        "text": L("Прозрачная информация о ходе проекта."),
                    },
                ],
                "benefits": [
                    L("Порог входа ниже, чем при покупке объекта целиком"),
                    L("Прозрачная история владения"),
                    L("Условия и доходность — после юридического согласования"),
                ],
                "disclaimer": L(
                    "Информация носит ознакомительный характер и не является публичной офертой "
                    "или инвестиционной рекомендацией. Юрисдикция, условия и риски будут опубликованы "
                    "после согласования. Текст дисклеймера — плейсхолдер."  # TODO: подтвердить у юристов
                ),
                "project_ids": ids([project_ids["aaag"], project_ids["birlik"]]),
            },
            {
                "type": "cta",
                "tone": "accent",
                "title": L("Хотите узнать об участии в проектах?"),
                "ctas": [cta("Оставить заявку", "#contacts")],
            },
            contact_form(
                "Стать инвестором",
                "Оставьте контакты, и мы пришлём презентацию проектов.",
                ["investor", "partner"],
                "investor",
            ),
        ],
    )

    await s.page(
        "team",
        title="Команда",
        seo_description="Люди MegaSmart: основатель, руководители и специалисты. Открытые вакансии.",
        sort_order=40,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Команда MegaSmart"),
                "title": L("Люди, которые строят"),
                "subtitle": L(
                    "Инженеры, архитекторы, технологи и менеджеры. Растём вместе с холдингом."
                ),
                "background_media_id": str(m_office),
                "ctas": [
                    cta("Открытые вакансии", "#vacancies"),
                    cta("Хочу в команду", "#contacts", "secondary"),
                ],
            },
            {
                "type": "capabilities",
                "tone": "light",
                "eyebrow": L("Культура"),
                "title": L("Что для нас важно"),
                "intro": L("Ценности команды — плейсхолдер, будут уточнены с HR."),
                "columns": 3,
                "items": [
                    {
                        "icon": "hammer",
                        "title": L("Делать руками"),
                        "text": L("Мы начинали в гараже и до сих пор ценим ремесло."),
                    },
                    {
                        "icon": "check",
                        "title": L("Отвечать за результат"),
                        "text": L("Каждый видит свой вклад в готовый объект."),
                    },
                    {
                        "icon": "trend",
                        "title": L("Расти"),
                        "text": L("Обучение, стажировки и новые направления."),
                    },
                ],
            },
            {"type": "team_grid", "mode": "founder", "eyebrow": L("Основатель")},
            {
                "type": "team_grid",
                "tone": "light",
                "mode": "key",
                "eyebrow": L("Руководство"),
                "title": L("Топ-менеджмент"),
            },
            {
                "type": "team_grid",
                "mode": "rest",
                "eyebrow": L("Специалисты"),
                "title": L("Команда"),
                "show_division_filter": True,
            },
            {
                "type": "vacancies",
                "anchor": "vacancies",
                "tone": "light",
                "eyebrow": L("Карьера"),
                "title": L("Открытые вакансии"),
                "empty_text": L("Сейчас открытых вакансий нет, но мы всегда рады резюме."),
            },
            {
                "type": "media_gallery",
                "eyebrow": L("Офис и производство"),
                "media_ids": ids([m_office, prod[1], m_office2, prod[2]]),
                "layout": "grid",
            },
            contact_form(
                "Хочу в команду",
                "Расскажите о себе, и HR свяжется с вами.",
                ["candidate"],
                "candidate",
            ),
        ],
    )

    await s.page(
        "clients",
        title="Наши клиенты",
        seo_description="Мебельщики, строительные компании, дизайнеры и дилеры, которые работают с MegaSmart.",
        sort_order=50,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Клиенты"),
                "title": L("С нами работают сотни компаний"),  # TODO: подтвердить у Романа (число)
                "subtitle": L(
                    "От небольших мебельных мастерских до девелоперов и дилеров в шести странах."
                ),
                "background_media_id": str(prod[3]),
                "ctas": [cta("Стать клиентом", "#contacts")],
            },
            {
                "type": "clients_grid",
                "tone": "light",
                "eyebrow": L("Клиенты"),
                "title": L("Кто с нами работает"),
                "show_industry_filter": True,
            },
            {"type": "testimonials", "eyebrow": L("Отзывы"), "title": L("Что говорят клиенты")},
            {
                "type": "cta",
                "tone": "accent",
                "title": L("Станьте нашим клиентом"),
                "text": L("Подберём материалы или предложим формат сотрудничества."),
                "ctas": [cta("Оставить заявку", "#contacts")],
            },
            contact_form(
                "Стать клиентом",
                "Опишите задачу, и мы предложим решение.",
                ["client", "partner"],
                "client",
            ),
        ],
    )
