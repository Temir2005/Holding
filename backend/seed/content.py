"""Test content in Russian.

Facts come from open sources and the brief; everything unverified is marked
`TODO: подтвердить у Романа`. Names of people and client companies are explicit
placeholders: no invented facts about real people or companies.

Photos are generated illustrations from seed/assets (see CREDITS.md); the founder's portrait
is his real photo. Maps are drawn from OpenStreetMap and Natural Earth data.
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
from seed.seeder import L, Seeder

CONTACT_FORM_CONSENT = "Нажимая кнопку, вы соглашаетесь на обработку персональных данных."

# Geographic edges of the map images in seed/assets (Web Mercator).
REGION_BOUNDS = {"west": 76.58, "east": 77.52, "south": 43.05, "north": 43.97}
EURASIA_BOUNDS = {"west": 20.0, "east": 84.0, "south": 34.0, "north": 60.0}
MAP_ATTRIBUTION = "© OpenStreetMap contributors"


def LL(ru: str, kk: str, en: str) -> dict[str, str]:
    """Localized text with all three languages (texts taken from the AAAG site)."""
    return {"ru": ru, "kk": kk, "en": en}


def contact_form(
    title: str, text: str, types: list[str], default: str, background: uuid.UUID, eyebrow: str
) -> dict[str, Any]:
    return {
        "type": "contact_form",
        "anchor": "contacts",
        "tone": "dark",
        "eyebrow": L(eyebrow),
        "title": L(title),
        "text": L(text),
        "lead_types": types,
        "default_type": default,
        "consent_text": L(CONTACT_FORM_CONSENT),
        "success_text": L("Заявка отправлена. Мы свяжемся с вами в течение рабочего дня."),
        "background_media_id": str(background),
    }


def cta(label: str, href: str, variant: str = "primary") -> dict[str, Any]:
    return {"label": L(label), "href": href, "variant": variant}


def ids(values: list[uuid.UUID]) -> list[str]:
    return [str(v) for v in values]


def item(title: str, text: str, icon: str = "check") -> dict[str, Any]:
    return {"icon": icon, "title": L(title), "text": L(text)}


async def seed_all(s: Seeder) -> None:
    # ------------------------------------------------------------------ media
    async def m(key: str, alt: str) -> uuid.UUID:
        return await s.media(key, img.asset(key), alt)

    m_hero = await m("hero-holding", "Новый жилой квартал в Шымкенте со строительными кранами")
    m_dev_site = await m("dev-site", "Монолитный каркас жилого дома и башенные краны")
    m_dev_land = await m("dev-land", "Участок под застройку на окраине города")
    m_dev_handover = await m("dev-handover", "Сданный жилой дом вечером")
    m_office = await m("office-team", "Команда обсуждает макет квартала в офисе")
    m_sp_prod = await m("sp-production", "Контроль глянцевой панели на линии покраски")
    m_sp_finishes = await m("sp-finishes", "Образцы МДФ-панелей разных цветов и фактур")
    m_kitchen_matte = await m("sp-kitchen-matte", "Кухня с матовыми фасадами")
    m_kitchen_gloss = await m("sp-kitchen-gloss", "Та же кухня с глянцевыми фасадами")
    m_kitchen_oak = await m("sp-kitchen-oak", "Та же кухня с фасадами под дуб")
    m_sp_truck = await m("sp-truck", "Отгрузка панелей со склада")
    m_workshop = await m("history-workshop", "Мастер распиливает плиту в небольшом цехе")
    m_alatau = await m("projects-alatau", "Новый городской район у подножия гор")
    m_birlik = [
        await m("birlik-1", "Визуализация квартала Birlik на фоне гор"),
        await m("birlik-2", "Двор без машин с детской площадкой"),
        await m("birlik-3", "Квартал на стадии строительства, вид сверху"),
    ]
    m_bc = await m("bc-office", "Офисное здание со стеклянным фасадом")
    m_logistics = await m("logistics", "Логистический склад с погрузочными доками")
    m_clients = await m("clients-hero", "Мастер устанавливает глянцевые фасады на кухонный модуль")
    m_aaag_sky = await m("aaag-sky", "Алматы и горы Заилийского Алатау утром")
    m_aaag_eco = await m("aaag-eco", "Вечерние предгорья над городом")
    m_evtol = await m("evtol-aaag", "Электрическое аэротакси AAAG")
    m_blueprint = await m("aaag-blueprint", "Чертёж аэротакси: вид сбоку и сверху")
    m_vertiport = await m("aaag-vertiport", "Аэротакси AAAG на площадке на крыше в Алматы")
    m_map_region = await m(
        "map-almaty-region", "Карта: Алматы, Конаев и Капшагайское водохранилище"
    )
    m_map_eurasia = await m("map-eurasia", "Карта Центральной Азии и Восточной Европы")

    # -------------------------------------------------------------- divisions
    d_dev = await s.upsert(
        Division,
        "division:development",
        slug="development",
        name=L("MegaSmart Development"),
        tagline=L("Полный цикл: участок, проект, свои материалы, стройка и сдача."),
        description=L(
            "Сами находим участок, проектируем, производим материалы на своём заводе, "
            "строим и сдаём объект."
        ),
        cover_id=m_dev_site,
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
        name=L("Smart Panels"),
        tagline=L("МДФ-панели и фасады: мат, глянец, текстуры, покраска по RAL и LAB."),
        description=L(
            "Матовые, глянцевые и текстурные панели, покраска по RAL и LAB, "
            "покрытие FOG против отпечатков. Отгрузка со склада за 2 дня."
        ),
        cover_id=m_sp_finishes,
        stats=[{"value": 30000, "suffix": L(" м²"), "label": L("производственных мощностей")}],
        website_url="https://smartpanels.kz",
        page_slug="smart-panels",
        sort_order=20,
    )
    d_aaag = await s.upsert(
        Division,
        "division:aaag",
        slug="aaag",
        name=L("AAAG"),
        tagline=L("Городская воздушная мобильность: аэротакси eVTOL в Alatau City."),
        description=L("Alatau Advance Air Group: электрические аэротакси, вертипорты и маршруты."),
        cover_id=m_vertiport,
        stats=[{"value": 180, "suffix": L(" км/ч"), "label": L("крейсерская скорость")}],
        website_url="https://aaag.kz",
        page_slug="aaag",
        sort_order=30,
    )
    d_new = await s.upsert(
        Division,
        "division:new-projects",
        slug="new-projects",
        name=L("Проекты в Alatau City"),
        tagline=L("Birlik и другие проекты нового города. Пилот токенизации недвижимости."),
        description=L(
            "Участие в строительстве Alatau City и пилот токенизации недвижимости. "
            "Детали проектов будут опубликованы позже."  # TODO: подтвердить у Романа
        ),
        cover_id=m_alatau,
        stats=[],
        page_slug="projects",
        sort_order=40,
    )

    # ---------------------------------------------------------------- projects
    project_specs: list[dict[str, Any]] = [
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
            short="Жилой квартал в Alatau City.",
            body=(
                "Описание проекта — плейсхолдер. Здесь будет текст из CMS: концепция квартала, "
                "архитектура, благоустройство, инфраструктура и этапы строительства."
            ),  # TODO: подтвердить у Романа
            tags=["Alatau City", "жильё"],
            cover=m_birlik[0],
            gallery=m_birlik,
        ),
        dict(
            slug="aaag",
            title="AAAG",
            division_id=d_aaag,
            status=ProjectStatus.in_progress,
            location="Alatau City",
            year=2028,
            area=None,
            featured=True,
            tokenized=True,
            short="Аэротакси eVTOL и вертипорты Alatau City.",
            body=(
                "Alatau Advance Air Group развивает городскую воздушную мобильность: электрические "
                "аэротакси, вертипорты на крышах и воздушные коридоры над городом. "
                "Коммерческий запуск запланирован на 2028 год."
            ),
            tags=["Alatau City", "eVTOL"],
            cover=m_vertiport,
            gallery=[m_vertiport, m_blueprint, m_aaag_sky],
        ),
        dict(
            slug="zhk-proekt-c",
            title="ЖК «Проект C»",
            division_id=d_dev,
            status=ProjectStatus.in_progress,
            location="Шымкент",
            year=2026,
            area=Decimal(24000),
            featured=True,
            tokenized=False,
            short="Жилой квартал с дворами без машин. Название и цифры — тестовые.",
            body="Описание проекта — плейсхолдер. Название и цифры тестовые.",
            tags=["жильё"],
            cover=m_dev_site,
            gallery=[m_dev_site, m_office],
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
            body="Описание проекта — плейсхолдер. Название и цифры тестовые.",
            tags=["жильё"],
            cover=m_dev_handover,
            gallery=[m_dev_handover, m_hero],
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
            body="Описание проекта — плейсхолдер. Название и цифры тестовые.",
            tags=["коммерция"],
            cover=m_bc,
            gallery=[m_bc],
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
            short="Производство МДФ-панелей по южнокорейской технологии.",
            body=(
                "Завод работает по южнокорейской технологии с 2015 года. Каждый лист проверяем "
                "на линии до упаковки."
            ),
            tags=["производство"],
            cover=m_sp_prod,
            gallery=[m_sp_prod, m_sp_truck, m_sp_finishes],
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
            body="Описание проекта — плейсхолдер. Название и цифры тестовые.",
            tags=["коммерция", "логистика"],
            cover=m_logistics,
            gallery=[m_logistics],
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
            body=L(p["body"]),
            cover_id=p["cover"],
            tags=p["tags"],
            is_featured=p["featured"],
            is_tokenized=p["tokenized"],
            is_published=True,
            sort_order=i * 10,
        )
        await s.gallery(pid, p["gallery"])
        project_ids[p["slug"]] = pid

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
        photo_id=await m("team-khegay", "Сергей Хегай"),
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
            photo_id=await m(f"person-{key}", f"Фото: {position}"),
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
        ("Альфа", "furniture", "#F0843E", 0),
        ("Бета", "construction", "#2E6FD8", 1),
        ("Гамма", "dealer", "#2E9E5B", 2),
        ("Дельта", "design", "#C2410C", 3),
        ("Эпсилон", "furniture", "#7C3AED", 4),
        ("Зета", "retail", "#0E7490", 5),
        ("Эта", "construction", "#B45309", 6),
        ("Тета", "dealer", "#BE123C", 0),
        ("Йота", "furniture", "#15803D", 1),
        ("Каппа", "design", "#4338CA", 2),
        ("Лямбда", "dealer", "#0369A1", 3),
        ("Мю", "construction", "#A16207", 4),
        ("Ню", "retail", "#9D174D", 5),
        ("Кси", "furniture", "#1D4ED8", 6),
    ]
    for i, (name, industry, color, shape) in enumerate(client_specs):
        testimonial = (
            {
                "quote": L(
                    "Отзыв клиента — плейсхолдер. Здесь будет короткая история сотрудничества "
                    "и конкретный результат."
                ),
                "author": L("Имя Фамилия"),
                "position": L(f"Директор, компания «{name}» (тест)"),
            }
            if i % 4 == 0
            else None
        )
        await s.upsert(
            Client,
            f"client:{i}",
            name=L(name),
            logo_id=await s.media(f"client-{i}", img.logo_mark(shape, color), f"Логотип {name}"),
            industry=industry,
            industry_label=L(industries[industry]),
            description=L("Тестовый клиент. Реальные клиенты появятся после согласования."),
            testimonial=testimonial,
            sort_order=i * 10,
        )

    # ---------------------------------------------------------------- timeline
    history = [
        (
            2004,
            "Сборочный цех в гараже",
            "Двое мастеров и первые заказы на мебель в Шымкенте.",
            m_workshop,
        ),
        (
            2007,
            "Первый мебельный магазин",
            "Своя розница и прямой контакт с покупателем.",
            m_kitchen_oak,
        ),
        (
            2015,
            "Завод МДФ-панелей",
            "Запустили производство по южнокорейской технологии вместе с партнёрами из Кореи.",
            m_sp_prod,
        ),
        (
            2017,
            "Экспорт",
            "Поставки в Узбекистан, Кыргызстан, Таджикистан, Россию и Беларусь.",
            m_sp_truck,
        ),
        (
            2024,
            "Девелопмент и Alatau City",
            "Холдинг строит сам — из собственных материалов — и входит в проекты нового города.",
            m_dev_site,
        ),  # TODO: подтвердить у Романа (год)
    ]
    history_ids = []
    for i, (year, title, text, media_id) in enumerate(history):
        history_ids.append(
            await s.upsert(
                TimelineEvent,
                f"timeline:{year}",
                year=year,
                title=L(title),
                description=L(text),
                image_id=media_id,
                is_published=True,
                sort_order=i * 10,
            )
        )  # TODO: подтвердить у Романа (все даты)
    # AAAG launch plan, from the AAAG site.
    roadmap = [
        (
            2025,
            "Исследования",
            "Территории для воздушной мобильности. Спрос на пассажирские перевозки.",
        ),
        (2026, "Тестовый контур", "Тестовый центр в Alatau City. Первый тестовый полёт."),
        (
            2027,
            "Нормативная база",
            "База знаний для законодательства. Проекты приоритетных вертипортов.",
        ),
        (2028, "Коммерческий запуск", "Авиалиния Alatau Skyline. Интеграция в транспорт города."),
    ]
    roadmap_ids = [
        await s.upsert(
            TimelineEvent,
            f"timeline:aaag:{year}",
            year=year,
            title=L(title),
            description=L(text),
            image_id=None,
            is_published=True,
            sort_order=100 + i * 10,
        )
        for i, (year, title, text) in enumerate(roadmap)
    ]

    # ------------------------------------------------------------------- stats
    stats: dict[str, list[tuple[int, str, str]]] = {
        "home": [
            (20, "+", "лет на рынке"),
            (30000, " м²", "производства"),
            (6, "", "стран поставок"),
            (30, "+", "дилеров в РК и СНГ"),
        ],
        "development": [
            (12, "", "объектов в портфеле"),  # TODO: подтвердить у Романа
            (5, "", "этапов в одних руках"),
            (100, "%", "отделки — своё производство"),  # TODO: подтвердить у Романа
            (20, "+", "лет в строительной отрасли"),
        ],
        "smart-panels": [
            (20, "+", "лет на рынке"),
            (30000, " м²", "производства"),
            (30, "+", "дилеров в РК и СНГ"),
            (20, "+", "цветов и фактур"),
        ],
        "aaag": [
            (180, " км/ч", "крейсерская скорость"),
            (600, " м", "высота коридора"),
            (0, " г CO₂", "выбросов в полёте"),
            (2028, "", "коммерческий запуск"),
        ],
        "projects": [
            (7, "", "объектов в портфеле"),
            (3, "", "реализовано"),
            (3, "", "в работе"),
            (2, "", "с токенизацией"),
        ],
        "clients": [
            (30, "+", "дилеров в РК и СНГ"),
            (6, "", "стран поставок"),
            (5, "", "отраслей"),
            (2, " дня", "отгрузка со склада"),
        ],
    }
    stat_ids: dict[str, list[str]] = {}
    for context, rows in stats.items():
        stat_ids[context] = []
        for i, (value, suffix, label) in enumerate(rows):
            sid = await s.upsert(
                Stat,
                f"stat:{context}:{i}",
                value=Decimal(value),
                prefix=None,
                suffix=L(suffix),
                label=L(label),
                context=context,
                sort_order=i * 10,
            )
            stat_ids[context].append(str(sid))

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
            {"label": L("Development"), "page_slug": "development"},
            {"label": L("Smart Panels"), "page_slug": "smart-panels"},
            {"label": L("AAAG"), "page_slug": "aaag"},
            {"label": L("Проекты"), "page_slug": "projects"},
            {"label": L("Команда"), "page_slug": "team"},
            {"label": L("Клиенты"), "page_slug": "clients"},
        ],
        header_cta=cta("Связаться", "#contacts"),
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
                "Холдинг полного цикла: производство материалов, девелопмент и проекты в Alatau City."
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
    await s.page(
        "home",
        title="Холдинг MegaSmart",
        seo_description="От мебельного цеха до холдинга полного цикла.",
        og_image_id=m_hero,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Холдинг · Шымкент · с 2004 года"),
                "title": L("Производим материалы\nи строим из них"),
                "subtitle": L(
                    "Начинали с мебельного цеха. Сегодня у нас завод МДФ-панелей, "
                    "девелопмент полного цикла и проекты в Alatau City."
                ),
                "background_media_id": str(m_hero),
                "ctas": [
                    cta("Стать партнёром", "#contacts"),
                    cta("Смотреть проекты", "projects", "secondary"),
                ],
                "stat_ids": stat_ids["home"],
            },
            {
                "type": "divisions_grid",
                "eyebrow": L("Направления"),
                "title": L("Четыре направления холдинга"),
                "division_ids": ids([d_dev, d_sp, d_aaag, d_new]),
            },
            {
                "type": "timeline",
                "tone": "light",
                "eyebrow": L("История"),
                "title": L("Как мебельный цех стал холдингом"),
                "event_ids": ids(history_ids),
            },
            {
                "type": "quote",
                "anchor": "founder",
                "eyebrow": L("Основатель"),
                "text": L(
                    "Здесь будет короткая мысль основателя о том, зачем мы строим "
                    "и что для нас значит качество."
                ),  # TODO: подтвердить у Романа
                "person_id": str(founder),
            },
            {
                "type": "projects_showcase",
                "tone": "light",
                "eyebrow": L("Проекты"),
                "title": L("Избранные объекты"),
                "featured": True,
                "link": cta("Все проекты", "projects", "secondary"),
            },
            {"type": "clients_marquee", "tone": "light", "eyebrow": L("Клиенты и партнёры")},
            contact_form(
                "Обсудим участие в проектах",
                "Расскажем о текущих объектах, сроках и формате участия. "
                "Ответим в течение рабочего дня.",
                ["investor", "partner", "client"],
                "investor",
                m_office,
                "Сотрудничество",
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
                "title": L("Девелопмент\nполного цикла"),
                "subtitle": L(
                    "Сами находим участок, проектируем, производим материалы на своём заводе, "
                    "строим и сдаём объект. Между этапами нет посредников."
                ),
                "background_media_id": str(m_dev_site),
                "ctas": [
                    cta("Обсудить проект", "#contacts"),
                    cta("Портфолио", "#portfolio", "secondary"),
                ],
                "stat_ids": stat_ids["development"],
            },
            {
                "type": "process_steps",
                "eyebrow": L("Полный цикл"),
                "title": L("Пять этапов без подрядчиков между ними"),
                "steps": [
                    {
                        "title": L("Поиск земли"),
                        "text": L(
                            "Подбираем участок, проверяем документы, сети и градостроительные "
                            "ограничения до покупки."
                        ),
                        "media_id": str(m_dev_land),
                    },
                    {
                        "title": L("Концепция и проект"),
                        "text": L(
                            "Свой проектный офис: архитектура, конструкции и инженерия. "
                            "Планировки считаем под реальный спрос."
                        ),
                        "media_id": str(m_office),
                    },
                    {
                        "title": L("Собственные материалы"),
                        "text": L(
                            "Фасадные и мебельные панели делает наш завод Smart Panels. Цена и сроки "
                            "поставки не зависят от чужих складов."
                        ),
                        "media_id": str(m_sp_prod),
                        "division_id": str(d_sp),
                    },
                    {
                        "title": L("Строительство"),
                        "text": L(
                            "Монолитный каркас, технадзор на каждом этапе, график стройки открыт "
                            "для инвестора."
                        ),  # TODO: подтвердить у Романа
                        "media_id": str(m_dev_site),
                    },
                    {
                        "title": L("Сдача и управление"),
                        "text": L(
                            "Сдаём объект, оформляем документы и остаёмся управляющей компанией."
                        ),  # TODO: подтвердить у Романа
                        "media_id": str(m_dev_handover),
                    },
                ],
            },
            {
                "type": "capabilities",
                "tone": "light",
                "eyebrow": L("Почему с нами"),
                "title": L("Что даёт полный цикл заказчику и инвестору"),
                "columns": 3,
                "items": [
                    item(
                        "Своё производство",
                        "Материалы отделки с нашего завода: без наценки посредников и ожидания поставок.",
                    ),
                    item(
                        "Проектный офис",
                        "Архитекторы и инженеры в штате, изменения в проект вносятся за дни, а не недели.",
                    ),
                    item("Контроль качества", "Технадзор и приёмка каждого этапа внутри компании."),
                    item(
                        "Предсказуемые сроки",
                        "График не зависит от подрядчиков: ключевые работы делаем сами.",
                    ),
                    item(
                        "Знание региона",
                        "Двадцать лет работы на юге Казахстана: участки, сети, согласования.",
                    ),
                    item("Сопровождение", "После сдачи остаёмся управляющей компанией объекта."),
                ],
            },
            {
                "type": "project_list",
                "anchor": "portfolio",
                "tone": "light",
                "eyebrow": L("Портфолио"),
                "title": L("Объекты"),
                "show_filter": True,
            },
            contact_form(
                "Есть участок или идея проекта?",
                "Оценим участок и предложим формат: совместная застройка, выкуп или инвестиции "
                "в проект.",
                ["partner", "investor", "client"],
                "partner",
                m_dev_handover,
                "Сотрудничество",
            ),
        ],
    )

    await s.page(
        "smart-panels",
        title="Smart Panels",
        seo_description="МДФ-панели и фасады: матовые, глянцевые, текстурные, покраска RAL/LAB, FOG.",
        sort_order=20,
        sections=[
            {
                "type": "hero",
                "theme": "smart_panels",
                "eyebrow": L("Smart Panels 2011 · Шымкент"),
                "title": L("МДФ-панели и фасады\nдля мебельщиков"),
                "subtitle": L(
                    "Матовые, глянцевые и текстурные панели, покраска по RAL и LAB, покрытие FOG "
                    "против отпечатков. Отгрузка со склада за 2 дня."
                ),
                "background_media_id": str(m_sp_finishes),
                "ctas": [
                    cta("Каталог на smartpanels.kz", "https://smartpanels.kz"),
                    cta("Стать дилером", "#contacts", "secondary"),
                ],
                "stat_ids": stat_ids["smart-panels"],
            },
            {
                "type": "finishes",
                "tone": "light",
                "eyebrow": L("Покрытия"),
                "title": L("Одна кухня, три покрытия"),
                "intro": L(
                    "Выберите покрытие — фасады этой кухни перекрасятся. Корпус, свет и столешница "
                    "те же: меняется только панель."
                ),
                "items": [
                    {
                        "label": L("Мат"),
                        "caption": L("Матовая · шалфей"),
                        "finish": "matte",
                        "color": "#8A9A84",
                        "media_id": str(m_kitchen_matte),
                    },
                    {
                        "label": L("Глянец"),
                        "caption": L("RAL 7016 · антрацит, глянец"),
                        "finish": "gloss",
                        "color": "#3B3F42",
                        "media_id": str(m_kitchen_gloss),
                    },
                    {
                        "label": L("Текстура"),
                        "caption": L("TX-04 · дуб, текстура"),
                        "finish": "texture",
                        "color": "#B08A5E",
                        "media_id": str(m_kitchen_oak),
                    },
                ],
            },
            {
                "type": "production",
                "eyebrow": L("Производство"),
                "title": L("Корейская линия, контроль каждого листа"),
                "body": L(
                    "Завод работает по южнокорейской технологии с 2015 года. Каждый лист проверяем "
                    "на линии до упаковки."
                ),
                "facts": [
                    {"value": "30 000 м²", "label": L("площадь производства")},
                    {"value": "50 листов", "label": L("минимальный заказ, 1 паллета")},
                    {"value": "2 дня", "label": L("отгрузка со склада")},
                ],
                "gallery_media_ids": ids([m_sp_prod, m_sp_truck]),
            },
            {
                "type": "geography",
                "eyebrow": L("География"),
                "title": L("Поставляем в шесть стран"),
                "intro": L("Все отгрузки идут со склада в Шымкенте."),
                "origin": L("Шымкент"),
                "origin_lat": 42.3417,
                "origin_lon": 69.5901,
                "map_media_id": str(m_map_eurasia),
                "bounds": EURASIA_BOUNDS,
                "countries": [
                    {"code": "KZ", "name": L("Казахстан"), "lat": 51.169, "lon": 71.449},
                    {"code": "UZ", "name": L("Узбекистан"), "lat": 41.311, "lon": 69.28},
                    {"code": "KG", "name": L("Кыргызстан"), "lat": 42.875, "lon": 74.59},
                    {"code": "TJ", "name": L("Таджикистан"), "lat": 38.56, "lon": 68.787},
                    {"code": "RU", "name": L("Россия"), "lat": 55.756, "lon": 37.617},
                    {"code": "BY", "name": L("Беларусь"), "lat": 53.902, "lon": 27.562},
                ],
            },
            {
                "type": "capabilities",
                "tone": "light",
                "eyebrow": L("Для кого"),
                "title": L("С нами работают"),
                "columns": 3,
                "items": [
                    item(
                        "Мебельщики",
                        "Готовые панели под кухни, шкафы и фасады — без своей покрасочной камеры.",
                    ),
                    item(
                        "Производства",
                        "Регулярные партии одного цвета от паллеты, отгрузка за 2 дня.",
                    ),
                    item(
                        "Дизайнеры",
                        "Любой цвет по RAL и LAB под проект интерьера, образцы по запросу.",
                    ),
                    item(
                        "Строительные компании",
                        "Отделка жилых комплексов и коммерческих объектов партиями.",
                    ),
                    item("Дилеры", "Дилерские условия в Казахстане и странах СНГ."),
                ],
            },
            contact_form(
                "Станьте дилером Smart Panels",
                "Каталог и цены — на smartpanels.kz. Условия для дилеров и производств пришлём "
                "после заявки.",
                ["partner", "client"],
                "partner",
                m_sp_truck,
                "Сотрудничество",
            ),
        ],
    )

    points = [
        {
            "key": "gd",
            "name": LL("Golden District", "Golden District", "Golden District"),
            "lat": 43.676667,
            "lon": 77.109167,
        },
        {
            "key": "fc",
            "name": LL("Финансовый центр", "Қаржы Орталығы", "Financial Center"),
            "lat": 43.23889,
            "lon": 76.94532,
        },
        {
            "key": "ap",
            "name": LL("Аэропорт Алматы", "Алматы әуежайы", "Almaty Airport"),
            "lat": 43.3521,
            "lon": 77.0405,
        },
        {
            "key": "kn",
            "name": LL("Конаев", "Қонаев қаласы", "Konaev"),
            "lat": 43.85517,
            "lon": 77.06146,
        },
        {"key": "md", "name": LL("Медео", "Медеу", "Medeo"), "lat": 43.1571772, "lon": 77.0594144},
    ]
    routes = [
        (
            "gd",
            "fc",
            LL(
                "Скоростной маршрут для деловых поездок, минуя городской трафик.",
                "Қалалық кептелісті айналып өтуге мүмкіндік беретін жылдам бағыт.",
                "Fast business route that bypasses city traffic.",
            ),
        ),
        (
            "ap",
            "gd",
            LL(
                "Трансфер из международного аэропорта в инновационный центр.",
                "Халықаралық әуежайдан инновациялық орталыққа трансфер.",
                "Transfer from the international airport to the innovation center.",
            ),
        ),
        (
            "kn",
            "gd",
            LL(
                "Живописный маршрут вдоль береговой линии и русла рек.",
                "Жағалау мен өзен арналары бойымен көркем маршрут.",
                "Scenic route along shoreline and riverbeds.",
            ),
        ),
        (
            "ap",
            "fc",
            LL(
                "Прямой маршрут из аэропорта к деловому кластеру города.",
                "Әуежайдан іскерлік кластерге тікелей маршрут.",
                "Direct route from the airport to the business cluster.",
            ),
        ),
        (
            "fc",
            "md",
            LL(
                "Быстрый трансфер из делового центра к высокогорному курорту.",
                "Іскерлік орталықтан биік таулы курортқа жылдам трансфер.",
                "Fast transfer from business district to mountain resort.",
            ),
        ),
    ]
    await s.page(
        "aaag",
        title="AAAG",
        seo_description="Аэротакси для Alatau City: электрические eVTOL, вертипорты и маршруты.",
        sort_order=25,
        sections=[
            {
                "type": "hero",
                "theme": "aaag",
                "eyebrow": L("AAAG · Alatau Advance Air Group"),
                "title": L("Аэротакси\nдля Alatau City"),
                "subtitle": L(
                    "Городская воздушная мобильность: электрические eVTOL, вертипорты на крышах "
                    "и маршруты над городским трафиком."
                ),
                "background_media_id": str(m_aaag_sky),
                "overlay_media_id": str(m_evtol),
                "ctas": [
                    cta("Стать партнёром", "#contacts"),
                    cta("Маршруты", "#routes", "secondary"),
                ],
                "stat_ids": stat_ids["aaag"],
            },
            {
                "type": "capabilities",
                "eyebrow": L("Технология"),
                "title": L("Электрический вертикальный взлёт"),
                "intro": L(
                    "eVTOL взлетает как вертолёт, а летит как самолёт. Ему нужна площадка на крыше, "
                    "а не взлётная полоса."
                ),
                "media_id": str(m_blueprint),
                "columns": 3,
                "items": [
                    item("Электрическая тяга", "Нет выбросов в полёте и тише вертолёта."),
                    item(
                        "Тройное резервирование",
                        "Каждая критичная система продублирована, полёт продолжается при отказе одной.",
                    ),
                    item(
                        "Умная навигация",
                        "Коридоры AAAG NAV над городом, без пересечения с наземным трафиком.",
                    ),
                ],
            },
            {
                "type": "air_routes",
                "anchor": "routes",
                "eyebrow": L("Воздушный коридор"),
                "title": L("Маршруты над Алматы"),
                "intro": L("Выберите маршрут: время считаем по прямой при крейсерской скорости."),
                "map_media_id": str(m_map_region),
                "bounds": REGION_BOUNDS,
                "attribution": MAP_ATTRIBUTION,
                "speed_kmh": 180,
                "points": points,
                "routes": [{"from_key": a, "to_key": b, "text": t} for a, b, t in routes],
            },
            {
                "type": "timeline",
                "tone": "light",
                "eyebrow": L("Этапы запуска"),
                "title": L("От исследований до коммерческих рейсов"),
                "event_ids": ids(roadmap_ids),
            },
            {
                "type": "about_text",
                "eyebrow": L("Инфраструктура"),
                "title": L("Вертипорты на крышах"),
                "body": L(
                    "Аэротакси не нужна взлётная полоса: площадки для взлёта и посадки размещаются "
                    "на крышах зданий Alatau City."
                ),
                "media_id": str(m_vertiport),
                "layout": "media_right",
            },
            contact_form(
                "Участвуйте в запуске",
                "Ищем инвесторов, операторов и партнёров по инфраструктуре.",
                ["investor", "partner"],
                "investor",
                m_aaag_eco,
                "Сотрудничество",
            ),
        ],
    )

    await s.page(
        "projects",
        title="Проекты",
        seo_description="Проекты MegaSmart в Шымкенте и Alatau City. Токенизация недвижимости.",
        sort_order=30,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Проекты холдинга"),
                "title": L("Строим в Шымкенте\nи в Alatau City"),
                "subtitle": L(
                    "Жильё, коммерческая недвижимость, производство и новые проекты в Alatau City. "
                    "По каждому объекту видно статус, локацию и ход работ."
                ),
                "background_media_id": str(m_alatau),
                "ctas": [
                    cta("Стать инвестором", "#contacts"),
                    cta("О токенизации", "#tokenization", "secondary"),
                ],
                "stat_ids": stat_ids["projects"],
            },
            {
                "type": "projects_map",
                "anchor": "alatau",
                "eyebrow": L("Alatau City"),
                "title": L("Проекты в новом городе"),
                "intro": L(
                    "Alatau City строится к северу от Алматы, по дороге на Конаев. "
                    "Здесь холдинг ведёт два проекта."
                ),
                "map_media_id": str(m_map_region),
                "bounds": REGION_BOUNDS,
                "attribution": MAP_ATTRIBUTION,
                "landmarks": [
                    {"key": "almaty", "name": L("Алматы"), "lat": 43.2567, "lon": 76.9286},
                    {"key": "airport", "name": L("Аэропорт"), "lat": 43.3521, "lon": 77.0405},
                    {"key": "konaev", "name": L("Конаев"), "lat": 43.85517, "lon": 77.06146},
                ],
                "pins": [
                    {
                        "project_id": str(project_ids["aaag"]),
                        "lat": 43.676667,
                        "lon": 77.109167,
                        "note": L("Вертипорт Golden District"),
                    },
                    {
                        "project_id": str(project_ids["birlik"]),
                        "lat": 43.74,
                        "lon": 77.0,
                        "note": L("Жилой квартал"),
                    },  # TODO: подтвердить у Романа (координаты)
                ],
                "note": L("Точка Birlik на карте — плейсхолдер, координаты придут из CMS."),
            },
            {
                "type": "project_list",
                "anchor": "list",
                "tone": "light",
                "eyebrow": L("Портфолио"),
                "title": L("Все объекты"),
                "show_filter": True,
            },
            {
                "type": "tokenization_explainer",
                "anchor": "tokenization",
                "eyebrow": L("Токенизация недвижимости"),
                "title": L("Доля в объекте в цифровом виде"),
                "intro": L(
                    "Токенизация позволяет оформить долю в объекте недвижимости как цифровой актив. "
                    "Механика согласуется с юристами, ниже — общая схема."
                ),
                "steps": [
                    item("Объект", "Выбираем проект и оформляем права.", "building"),
                    item("Доли", "Объект делится на цифровые доли.", "split"),
                    item("Инвестор", "Инвестор приобретает долю удобного размера.", "wallet"),
                    item("Отчётность", "Прозрачная информация о ходе проекта.", "chart"),
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
                "project_ids": ids([project_ids["birlik"], project_ids["aaag"]]),
            },
            contact_form(
                "Хотите участвовать в проектах?",
                "Оставьте контакты, и мы пришлём презентацию проектов.",
                ["investor", "partner"],
                "investor",
                m_birlik[2],
                "Инвесторам",
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
                    item("Делать руками", "Мы начинали в гараже и до сих пор ценим ремесло."),
                    item("Отвечать за результат", "Каждый видит свой вклад в готовый объект."),
                    item("Расти", "Обучение, стажировки и новые направления."),
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
                "tone": "light",
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
                "empty_text": L("Не нашли подходящую? Мы всегда рады резюме."),
            },
            {
                "type": "media_gallery",
                "eyebrow": L("Офис и производство"),
                "media_ids": ids([m_office, m_sp_prod, m_dev_site, m_workshop]),
                "layout": "grid",
            },
            contact_form(
                "Хочу в команду",
                "Расскажите о себе, и HR свяжется с вами.",
                ["candidate"],
                "candidate",
                m_sp_prod,
                "Карьера",
            ),
        ],
    )

    await s.page(
        "clients",
        title="Клиенты",
        seo_description="Мебельщики, строительные компании, дизайнеры и дилеры, которые работают с MegaSmart.",
        sort_order=50,
        sections=[
            {
                "type": "hero",
                "eyebrow": L("Клиенты"),
                "title": L("Мебельщики, строители\nи дилеры"),
                "subtitle": L(
                    "От небольших мебельных мастерских до девелоперов и дилеров в шести странах."
                ),
                "background_media_id": str(m_clients),
                "ctas": [
                    cta("Стать клиентом", "#contacts"),
                    cta("Отзывы", "#reviews", "secondary"),
                ],
                "stat_ids": stat_ids["clients"],
            },
            {
                "type": "clients_grid",
                "tone": "light",
                "eyebrow": L("Кто с нами работает"),
                "title": L("Клиенты по отраслям"),
                "show_industry_filter": True,
            },
            {
                "type": "testimonials",
                "anchor": "reviews",
                "eyebrow": L("Отзывы"),
                "title": L("Что говорят клиенты"),
            },
            contact_form(
                "Станьте нашим клиентом",
                "Опишите задачу: подберём материалы или предложим формат сотрудничества.",
                ["client", "partner"],
                "client",
                m_sp_finishes,
                "Сотрудничество",
            ),
        ],
    )
