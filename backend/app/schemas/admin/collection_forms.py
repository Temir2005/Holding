"""Admin forms of the collections (GET /admin/entity-types), one per collection.

They describe the same fields as the Update schemas, with Russian titles and UI hints, so
the admin builds every collection form with SchemaForm. A test keeps each form in step
with its Update schema. Media fields state which kinds of files fit (`Ref.accept`), and
saving checks the same (CollectionService.form).
"""

import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict

from app.core.i18n import LocalizedText, RequiredText
from app.models import EmploymentType, ProjectStatus
from app.schemas.admin.collections import Tag, Url, Year
from app.schemas.admin.pages import Slug
from app.schemas.fields import field
from app.schemas.refs import MediaAccept, Ref, RefKind

L = LocalizedText
RL = RequiredText

PROJECT_STATUS_LABELS = {
    ProjectStatus.completed: "Реализован",
    ProjectStatus.in_progress: "Строится",
    ProjectStatus.planned: "В планах",
}
EMPLOYMENT_LABELS = {
    EmploymentType.full_time: "Полная занятость",
    EmploymentType.part_time: "Частичная занятость",
    EmploymentType.contract: "Контракт",
    EmploymentType.internship: "Стажировка",
}

PICTURE: tuple[MediaAccept, ...] = ("image",)
LOGO: tuple[MediaAccept, ...] = ("image", "svg")
KEY_PATTERN = r"^[a-z0-9_-]+$"

MediaId = uuid.UUID | None
DivisionId = Annotated[uuid.UUID | None, Ref(RefKind.division, "division")]


class Form(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --- divisions -------------------------------------------------------------------------


class DivisionStatItem(Form):
    model_config = ConfigDict(title="Цифра")

    value: float = field("Число")
    suffix: L | None = field("После числа", widget="localized-text", default=None)
    label: RL = field("Подпись", widget="localized-text")


class DivisionForm(Form):
    model_config = ConfigDict(title="Направление")

    name: RL = field("Название", widget="localized-text")
    slug: Slug = field(
        "Ключ",
        description="Латиница, цифры и дефисы. По нему блоки страниц отбирают проекты направления",
    )
    tagline: L | None = field("Слоган", widget="localized-text", default=None)
    description: L | None = field("Описание", widget="localized-textarea", default=None)
    logo_id: Annotated[MediaId, Ref(RefKind.media, "logo", LOGO)] = field("Логотип", default=None)
    cover_id: Annotated[MediaId, Ref(RefKind.media, "cover", PICTURE)] = field(
        "Обложка", default=None
    )
    stats: list[DivisionStatItem] = field("Цифры", default_factory=list, max_length=8)
    website_url: Url | None = field("Сайт направления", default=None)
    page_slug: str | None = field(
        "Страница направления", widget="page", default=None, max_length=128
    )
    is_published: bool = field("На сайте", default=False)


# --- projects --------------------------------------------------------------------------


class ProjectForm(Form):
    model_config = ConfigDict(title="Проект")

    title: RL = field("Название", widget="localized-text")
    slug: Slug = field(
        "Адрес", description="Латиница, цифры и дефисы: страница проекта /projects/<адрес>"
    )
    division_id: DivisionId = field("Направление", default=None)
    status: ProjectStatus = field(
        "Статус", labels=PROJECT_STATUS_LABELS, default=ProjectStatus.planned
    )
    location: L | None = field("Где находится", widget="localized-text", default=None)
    year: Year | None = field("Год", default=None)
    area_m2: float | None = field("Площадь, м²", default=None, ge=0)
    short_description: L | None = field(
        "Коротко",
        widget="localized-textarea",
        description="В карточке проекта и в описании для поиска",
        default=None,
    )
    body: L | None = field("Описание", widget="markdown", default=None)
    cover_id: Annotated[MediaId, Ref(RefKind.media, "cover", PICTURE)] = field(
        "Обложка", default=None
    )
    gallery: Annotated[list[uuid.UUID], Ref(RefKind.media, "gallery", PICTURE)] = field(
        "Галерея", default_factory=list, max_length=60
    )
    tags: list[Tag] = field("Теги", widget="tags", default_factory=list, max_length=20)
    is_featured: bool = field("Избранный проект", default=False)
    is_tokenized: bool = field("Токенизация", default=False)
    is_published: bool = field("На сайте", default=False)


# --- people ----------------------------------------------------------------------------


class PersonForm(Form):
    model_config = ConfigDict(title="Сотрудник")

    full_name: RL = field("Имя и фамилия", widget="localized-text")
    position: L | None = field("Должность", widget="localized-text", default=None)
    division_id: DivisionId = field("Направление", default=None)
    bio: L | None = field("О человеке", widget="localized-textarea", default=None)
    photo_id: Annotated[MediaId, Ref(RefKind.media, "photo", PICTURE)] = field("Фото", default=None)
    linkedin_url: Url | None = field("LinkedIn", default=None)
    is_key: bool = field("Ключевой сотрудник", default=False)
    is_founder: bool = field("Основатель", default=False)
    is_published: bool = field("На сайте", default=False)


# --- clients ---------------------------------------------------------------------------


class TestimonialForm(Form):
    model_config = ConfigDict(title="Отзыв")

    quote: RL = field("Текст отзыва", widget="localized-textarea")
    author: RL = field("Автор", widget="localized-text")
    position: L | None = field("Должность автора", widget="localized-text", default=None)


class ClientForm(Form):
    model_config = ConfigDict(title="Клиент")

    name: RL = field("Название", widget="localized-text")
    logo_id: Annotated[MediaId, Ref(RefKind.media, "logo", LOGO)] = field("Логотип", default=None)
    industry_label: RL = field("Отрасль", widget="localized-text")
    industry: str = field(
        "Ключ отрасли",
        widget="combobox",
        options="client_industries",
        description="Латиница, цифры, дефис и подчёркивание. Клиенты с одним ключом "
        "попадают в один фильтр на сайте",
        min_length=1,
        max_length=64,
        pattern=KEY_PATTERN,
    )
    description: L | None = field("Описание", widget="localized-textarea", default=None)
    testimonial: TestimonialForm | None = field("Отзыв", default=None)
    website_url: Url | None = field("Сайт", default=None)
    is_published: bool = field("На сайте", default=False)


# --- timeline, stats, vacancies ----------------------------------------------------------


class TimelineEventForm(Form):
    model_config = ConfigDict(title="Событие истории")

    year: Year = field("Год")
    title: RL = field("Событие", widget="localized-text")
    description: L | None = field("Описание", widget="localized-textarea", default=None)
    image_id: Annotated[MediaId, Ref(RefKind.media, "image", PICTURE)] = field(
        "Картинка", default=None
    )
    is_published: bool = field("На сайте", default=False)


class StatForm(Form):
    model_config = ConfigDict(title="Цифра")

    value: float = field("Число")
    prefix: str | None = field(
        "Перед числом", description="Например «до» или «>»", default=None, max_length=16
    )
    suffix: L | None = field(
        "После числа", widget="localized-text", description="Например «+» или «млн»", default=None
    )
    label: RL = field("Подпись", widget="localized-text")
    context: str = field(
        "Набор",
        widget="combobox",
        options="stat_contexts",
        description="Блок «Цифры» на странице показывает один набор, например home",
        min_length=1,
        max_length=64,
        pattern=KEY_PATTERN,
    )
    is_published: bool = field("На сайте", default=False)


class VacancyForm(Form):
    model_config = ConfigDict(title="Вакансия")

    title: RL = field("Должность", widget="localized-text")
    division_id: DivisionId = field("Направление", default=None)
    location: L | None = field("Город", widget="localized-text", default=None)
    employment_type: EmploymentType = field(
        "Занятость", labels=EMPLOYMENT_LABELS, default=EmploymentType.full_time
    )
    description: L | None = field("Описание", widget="localized-textarea", default=None)
    is_open: bool = field("Набор открыт", default=True)
    is_published: bool = field("На сайте", default=False)


# Entity type (as in usages and the audit log) → (label, form).
COLLECTION_FORMS: dict[str, tuple[str, type[BaseModel]]] = {
    "division": ("Направление", DivisionForm),
    "project": ("Проект", ProjectForm),
    "person": ("Сотрудник", PersonForm),
    "client": ("Клиент", ClientForm),
    "timeline_event": ("Событие истории", TimelineEventForm),
    "stat": ("Цифра", StatForm),
    "vacancy": ("Вакансия", VacancyForm),
}
