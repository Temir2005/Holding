"""Section types.

Each section type has two models:

* `<Name>Data`: what is stored in `section.data` (JSONB). Text is `LocalizedText`,
  entities are referenced by id through `Ref` annotations.
* `<Name>DataRead`: what the public API returns. Text is resolved for the requested
  locale and references are expanded into full entities (see app.schemas.refs).

The read envelopes (`HeroSection`, ...) form a discriminated union on `type`, which
the frontend receives as a typed union through the generated OpenAPI types.

Adding a section type: add the enum value, the two data models (stored fields get
Russian titles and UI hints via `field()`), the envelope, an entry in SECTION_SCHEMAS
(with label and description) and a React component in the frontend registry.
"""

import uuid
from dataclasses import dataclass
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.i18n import LocalizedText
from app.models import LeadType
from app.schemas.entities import (
    ClientRead,
    DivisionRead,
    MediaRead,
    PersonRead,
    ProjectCard,
    StatRead,
    TimelineEventRead,
    VacancyRead,
)
from app.schemas.fields import HexColor, IconName, LinkHref, field
from app.schemas.refs import Ref, RefKind

L = LocalizedText

LEAD_TYPE_LABELS = {
    LeadType.investor: "Инвестиции",
    LeadType.partner: "Партнёрство",
    LeadType.candidate: "Работа в команде",
    LeadType.client: "Заказ продукции",
}


def _media(target: str) -> Ref:
    return Ref(RefKind.media, target)


class SectionType(StrEnum):
    hero = "hero"
    stats = "stats"
    about_text = "about_text"
    timeline = "timeline"
    divisions_grid = "divisions_grid"
    projects_showcase = "projects_showcase"
    project_list = "project_list"
    capabilities = "capabilities"
    process_steps = "process_steps"
    production = "production"
    tokenization_explainer = "tokenization_explainer"
    team_grid = "team_grid"
    clients_marquee = "clients_marquee"
    clients_grid = "clients_grid"
    testimonials = "testimonials"
    quote = "quote"
    cta = "cta"
    contact_form = "contact_form"
    media_gallery = "media_gallery"
    video = "video"
    vacancies = "vacancies"
    geography = "geography"


class Tone(StrEnum):
    dark = "dark"
    light = "light"
    accent = "accent"


# ---------------------------------------------------------------------------
# Shared parts
# ---------------------------------------------------------------------------


class Stored(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SectionData(Stored):
    eyebrow: L | None = field("Надзаголовок", widget="localized-text", default=None)
    title: L | None = field("Заголовок", widget="localized-text", default=None)


class SectionDataRead(BaseModel):
    eyebrow: str | None = None
    title: str | None = None


class Cta(Stored):
    model_config = ConfigDict(title="Кнопка")

    label: L = field("Текст кнопки", widget="localized-text")
    href: LinkHref = field(
        "Ссылка", description="https://…, #якорь на странице, slug страницы или projects/<slug>"
    )
    variant: Literal["primary", "secondary"] = field(
        "Вид", labels={"primary": "Основная", "secondary": "Второстепенная"}, default="primary"
    )


class CtaRead(BaseModel):
    label: str
    href: str
    variant: Literal["primary", "secondary"]


class IconItem(Stored):
    model_config = ConfigDict(title="Пункт с иконкой")

    icon: IconName = field("Иконка")
    title: L = field("Заголовок", widget="localized-text")
    text: L = field("Текст", widget="localized-textarea")
    media_id: Annotated[uuid.UUID | None, _media("media")] = field(
        "Картинка вместо иконки", default=None
    )


class IconItemRead(BaseModel):
    icon: str
    title: str
    text: str
    media: MediaRead | None


# ---------------------------------------------------------------------------
# Section data: stored / read pairs
# ---------------------------------------------------------------------------


class Swatch(Stored):
    model_config = ConfigDict(title="Образец панели")

    code: str = field("Код (RAL, LAB…)", max_length=32)
    label: L = field("Название", widget="localized-text")
    color: HexColor = field("Цвет")
    finish: Literal["matte", "gloss", "texture"] = field(
        "Покрытие",
        labels={"matte": "Матовое", "gloss": "Глянец", "texture": "Текстура"},
        default="matte",
    )


class SwatchRead(BaseModel):
    code: str
    label: str
    color: str
    finish: Literal["matte", "gloss", "texture"]


class HeroData(SectionData):
    subtitle: L | None = field("Подзаголовок", widget="localized-textarea", default=None)
    background_media_id: Annotated[uuid.UUID | None, _media("background")] = field(
        "Фоновое изображение", default=None
    )
    video_media_id: Annotated[uuid.UUID | None, _media("video")] = field(
        "Фоновое видео", default=None
    )
    ctas: list[Cta] = field("Кнопки", default_factory=list)
    swatches: list[Swatch] = field(
        "Образцы панелей",
        description="Если заполнены, фото показывается в сетке с образцами",
        default_factory=list,
    )


class HeroDataRead(SectionDataRead):
    subtitle: str | None = None
    background: MediaRead | None = None
    video: MediaRead | None = None
    ctas: list[CtaRead] = []
    swatches: list[SwatchRead] = []


class StatsData(SectionData):
    # Either explicit ids or a context ("home", "smart-panels"); explicit ids win.
    context: str | None = field(
        "Набор цифр",
        description="Например home или smart-panels; не нужен, если цифры выбраны",
        default=None,
    )
    stat_ids: Annotated[list[uuid.UUID], Ref(RefKind.stat, "stats")] = field(
        "Цифры", default_factory=list
    )


class StatsDataRead(SectionDataRead):
    stats: list[StatRead] = []


class AboutTextData(SectionData):
    body: L = field("Текст", widget="markdown")
    media_id: Annotated[uuid.UUID | None, _media("media")] = field("Изображение", default=None)
    layout: Literal["text_only", "media_left", "media_right"] = field(
        "Расположение",
        labels={
            "text_only": "Только текст",
            "media_left": "Картинка слева",
            "media_right": "Картинка справа",
        },
        default="text_only",
    )


class AboutTextDataRead(SectionDataRead):
    body: str
    media: MediaRead | None = None
    layout: Literal["text_only", "media_left", "media_right"]


class TimelineData(SectionData):
    # Empty means every published event, ordered by year.
    event_ids: Annotated[list[uuid.UUID], Ref(RefKind.timeline_event, "events")] = field(
        "События", description="Пусто — все опубликованные события по годам", default_factory=list
    )


class TimelineDataRead(SectionDataRead):
    events: list[TimelineEventRead] = []


class DivisionsGridData(SectionData):
    division_ids: Annotated[list[uuid.UUID], Ref(RefKind.division, "divisions")] = field(
        "Направления", default_factory=list
    )


class DivisionsGridDataRead(SectionDataRead):
    divisions: list[DivisionRead] = []


class ProjectsShowcaseData(SectionData):
    # With `featured`, the list is every featured project; otherwise `project_ids`.
    featured: bool = field("Показывать избранные проекты", default=False)
    project_ids: Annotated[list[uuid.UUID], Ref(RefKind.project, "projects")] = field(
        "Проекты", description="Используется, если не включены избранные", default_factory=list
    )
    link: Cta | None = field("Ссылка «Все проекты»", default=None)


class ProjectsShowcaseDataRead(SectionDataRead):
    projects: list[ProjectCard] = []
    link: CtaRead | None = None


class ProjectListData(SectionData):
    # Live query: every published project, optionally limited to one division.
    division_slug: str | None = field(
        "Только направление (slug)", description="Пусто — проекты всех направлений", default=None
    )
    show_filter: bool = field("Фильтр по статусу", default=True)
    project_ids: Annotated[list[uuid.UUID], Ref(RefKind.project, "projects")] = field(
        "Проекты", description="Пусто — все опубликованные", default_factory=list
    )


class ProjectListDataRead(SectionDataRead):
    show_filter: bool
    projects: list[ProjectCard] = []


class CapabilitiesData(SectionData):
    intro: L | None = field("Вступление", widget="localized-textarea", default=None)
    items: list[IconItem] = field("Пункты", default_factory=list)
    columns: Literal[2, 3, 4] = field(
        "Колонок", labels={2: "Две", 3: "Три", 4: "Четыре"}, default=3
    )


class CapabilitiesDataRead(SectionDataRead):
    intro: str | None = None
    items: list[IconItemRead] = []
    columns: Literal[2, 3, 4]


class ProcessStep(Stored):
    model_config = ConfigDict(title="Этап")

    title: L = field("Название этапа", widget="localized-text")
    text: L = field("Описание", widget="localized-textarea")
    media_id: Annotated[uuid.UUID | None, _media("media")] = field("Изображение", default=None)
    division_id: Annotated[uuid.UUID | None, Ref(RefKind.division, "division")] = field(
        "Ссылка на направление", default=None
    )


class ProcessStepRead(BaseModel):
    title: str
    text: str
    media: MediaRead | None
    division: DivisionRead | None


class ProcessStepsData(SectionData):
    intro: L | None = field("Вступление", widget="localized-textarea", default=None)
    steps: list[ProcessStep] = field("Этапы", default_factory=list)


class ProcessStepsDataRead(SectionDataRead):
    intro: str | None = None
    steps: list[ProcessStepRead] = []


class Fact(Stored):
    model_config = ConfigDict(title="Факт")

    value: str = field("Значение", max_length=64)
    label: L = field("Подпись", widget="localized-text")


class FactRead(BaseModel):
    value: str
    label: str


class ProductionData(SectionData):
    body: L = field("Текст", widget="localized-textarea")
    facts: list[Fact] = field("Факты", default_factory=list)
    gallery_media_ids: Annotated[list[uuid.UUID], _media("gallery")] = field(
        "Галерея", default_factory=list
    )


class ProductionDataRead(SectionDataRead):
    body: str
    facts: list[FactRead] = []
    gallery: list[MediaRead] = []


class TokenizationData(SectionData):
    intro: L = field("Вступление", widget="localized-textarea")
    steps: list[IconItem] = field("Как это работает", default_factory=list)
    benefits: list[L] = field("Преимущества", widget="localized-text", default_factory=list)
    # Legal text is edited in the CMS; never hard-code yields or jurisdictions.
    disclaimer: L = field("Юридический дисклеймер", widget="localized-textarea")
    project_ids: Annotated[list[uuid.UUID], Ref(RefKind.project, "projects")] = field(
        "Токенизированные проекты", default_factory=list
    )


class TokenizationDataRead(SectionDataRead):
    intro: str
    steps: list[IconItemRead] = []
    benefits: list[str] = []
    disclaimer: str
    projects: list[ProjectCard] = []


class TeamGridData(SectionData):
    intro: L | None = field("Вступление", widget="localized-textarea", default=None)
    # founder / key / rest: live queries; explicit ids override.
    mode: Literal["founder", "key", "rest", "all"] = field(
        "Кого показывать",
        labels={
            "founder": "Основателя",
            "key": "Руководство",
            "rest": "Остальную команду",
            "all": "Всех",
        },
        default="all",
    )
    show_division_filter: bool = field("Фильтр по направлению", default=False)
    person_ids: Annotated[list[uuid.UUID], Ref(RefKind.person, "people")] = field(
        "Люди", description="Если выбраны, заменяют выборку по режиму", default_factory=list
    )


class TeamGridDataRead(SectionDataRead):
    intro: str | None = None
    mode: Literal["founder", "key", "rest", "all"]
    show_division_filter: bool
    people: list[PersonRead] = []


class ClientsMarqueeData(SectionData):
    # Empty means every published client.
    client_ids: Annotated[list[uuid.UUID], Ref(RefKind.client, "clients")] = field(
        "Клиенты", description="Пусто — все опубликованные", default_factory=list
    )


class ClientsMarqueeDataRead(SectionDataRead):
    clients: list[ClientRead] = []


class ClientsGridData(SectionData):
    show_industry_filter: bool = field("Фильтр по отрасли", default=True)
    client_ids: Annotated[list[uuid.UUID], Ref(RefKind.client, "clients")] = field(
        "Клиенты", description="Пусто — все опубликованные", default_factory=list
    )


class ClientsGridDataRead(SectionDataRead):
    show_industry_filter: bool
    clients: list[ClientRead] = []


class TestimonialsData(SectionData):
    # Empty means every published client that has a testimonial.
    client_ids: Annotated[list[uuid.UUID], Ref(RefKind.client, "clients")] = field(
        "Клиенты с отзывами", description="Пусто — все, у кого есть отзыв", default_factory=list
    )


class TestimonialsDataRead(SectionDataRead):
    clients: list[ClientRead] = []


class QuoteData(SectionData):
    text: L = field("Цитата", widget="localized-textarea")
    person_id: Annotated[uuid.UUID | None, Ref(RefKind.person, "person")] = field(
        "Автор", default=None
    )
    media_id: Annotated[uuid.UUID | None, _media("media")] = field(
        "Фото", description="Пусто — фото автора", default=None
    )


class QuoteDataRead(SectionDataRead):
    text: str
    person: PersonRead | None = None
    media: MediaRead | None = None


class CtaData(SectionData):
    text: L | None = field("Текст", widget="localized-textarea", default=None)
    ctas: list[Cta] = field("Кнопки", default_factory=list)
    media_id: Annotated[uuid.UUID | None, _media("media")] = field("Изображение", default=None)


class CtaDataRead(SectionDataRead):
    text: str | None = None
    ctas: list[CtaRead] = []
    media: MediaRead | None = None


class ContactFormData(SectionData):
    text: L | None = field("Текст рядом с формой", widget="localized-textarea", default=None)
    lead_types: list[LeadType] = field(
        "Темы обращения",
        labels=LEAD_TYPE_LABELS,
        default_factory=lambda: [LeadType.partner],
    )
    default_type: LeadType = field(
        "Тема по умолчанию", labels=LEAD_TYPE_LABELS, default=LeadType.partner
    )
    consent_text: L = field("Согласие на обработку данных", widget="localized-textarea")
    success_text: L = field("Сообщение после отправки", widget="localized-textarea")


class ContactFormDataRead(SectionDataRead):
    text: str | None = None
    lead_types: list[LeadType]
    default_type: LeadType
    consent_text: str
    success_text: str


class MediaGalleryData(SectionData):
    media_ids: Annotated[list[uuid.UUID], _media("items")] = field(
        "Изображения", default_factory=list
    )
    layout: Literal["grid", "strip"] = field(
        "Раскладка", labels={"grid": "Сетка", "strip": "Лента"}, default="grid"
    )


class MediaGalleryDataRead(SectionDataRead):
    items: list[MediaRead] = []
    layout: Literal["grid", "strip"]


class VideoData(SectionData):
    embed_url: str | None = field(
        "Ссылка для встраивания",
        description="YouTube/Vimeo embed; или загруженное видео",
        max_length=500,
        default=None,
    )
    video_media_id: Annotated[uuid.UUID | None, _media("video")] = field("Видеофайл", default=None)
    poster_media_id: Annotated[uuid.UUID | None, _media("poster")] = field("Обложка", default=None)


class VideoDataRead(SectionDataRead):
    embed_url: str | None = None
    video: MediaRead | None = None
    poster: MediaRead | None = None


class VacanciesData(SectionData):
    intro: L | None = field("Вступление", widget="localized-textarea", default=None)
    # Live query: every open vacancy, optionally limited to one division.
    division_slug: str | None = field(
        "Только направление (slug)", description="Пусто — все направления", default=None
    )
    vacancy_ids: Annotated[list[uuid.UUID], Ref(RefKind.vacancy, "vacancies")] = field(
        "Вакансии", description="Пусто — все открытые", default_factory=list
    )
    empty_text: L | None = field(
        "Текст, когда вакансий нет", widget="localized-textarea", default=None
    )


class VacanciesDataRead(SectionDataRead):
    intro: str | None = None
    vacancies: list[VacancyRead] = []
    empty_text: str | None = None


class Country(Stored):
    model_config = ConfigDict(title="Страна")

    code: str = field("Код страны (2 буквы)", min_length=2, max_length=2)
    name: L = field("Название", widget="localized-text")
    note: L | None = field("Пояснение", widget="localized-text", default=None)


class CountryRead(BaseModel):
    code: str
    name: str
    note: str | None


class GeographyData(SectionData):
    intro: L | None = field("Вступление", widget="localized-textarea", default=None)
    countries: list[Country] = field("Страны", default_factory=list)


class GeographyDataRead(SectionDataRead):
    intro: str | None = None
    countries: list[CountryRead] = []


# ---------------------------------------------------------------------------
# Read envelopes (discriminated union)
# ---------------------------------------------------------------------------


class SectionBase(BaseModel):
    id: uuid.UUID
    anchor: str | None
    tone: Tone


class HeroSection(SectionBase):
    type: Literal["hero"]
    data: HeroDataRead


class StatsSection(SectionBase):
    type: Literal["stats"]
    data: StatsDataRead


class AboutTextSection(SectionBase):
    type: Literal["about_text"]
    data: AboutTextDataRead


class TimelineSection(SectionBase):
    type: Literal["timeline"]
    data: TimelineDataRead


class DivisionsGridSection(SectionBase):
    type: Literal["divisions_grid"]
    data: DivisionsGridDataRead


class ProjectsShowcaseSection(SectionBase):
    type: Literal["projects_showcase"]
    data: ProjectsShowcaseDataRead


class ProjectListSection(SectionBase):
    type: Literal["project_list"]
    data: ProjectListDataRead


class CapabilitiesSection(SectionBase):
    type: Literal["capabilities"]
    data: CapabilitiesDataRead


class ProcessStepsSection(SectionBase):
    type: Literal["process_steps"]
    data: ProcessStepsDataRead


class ProductionSection(SectionBase):
    type: Literal["production"]
    data: ProductionDataRead


class TokenizationSection(SectionBase):
    type: Literal["tokenization_explainer"]
    data: TokenizationDataRead


class TeamGridSection(SectionBase):
    type: Literal["team_grid"]
    data: TeamGridDataRead


class ClientsMarqueeSection(SectionBase):
    type: Literal["clients_marquee"]
    data: ClientsMarqueeDataRead


class ClientsGridSection(SectionBase):
    type: Literal["clients_grid"]
    data: ClientsGridDataRead


class TestimonialsSection(SectionBase):
    type: Literal["testimonials"]
    data: TestimonialsDataRead


class QuoteSection(SectionBase):
    type: Literal["quote"]
    data: QuoteDataRead


class CtaSection(SectionBase):
    type: Literal["cta"]
    data: CtaDataRead


class ContactFormSection(SectionBase):
    type: Literal["contact_form"]
    data: ContactFormDataRead


class MediaGallerySection(SectionBase):
    type: Literal["media_gallery"]
    data: MediaGalleryDataRead


class VideoSection(SectionBase):
    type: Literal["video"]
    data: VideoDataRead


class VacanciesSection(SectionBase):
    type: Literal["vacancies"]
    data: VacanciesDataRead


class GeographySection(SectionBase):
    type: Literal["geography"]
    data: GeographyDataRead


SectionRead = Annotated[
    HeroSection
    | StatsSection
    | AboutTextSection
    | TimelineSection
    | DivisionsGridSection
    | ProjectsShowcaseSection
    | ProjectListSection
    | CapabilitiesSection
    | ProcessStepsSection
    | ProductionSection
    | TokenizationSection
    | TeamGridSection
    | ClientsMarqueeSection
    | ClientsGridSection
    | TestimonialsSection
    | QuoteSection
    | CtaSection
    | ContactFormSection
    | MediaGallerySection
    | VideoSection
    | VacanciesSection
    | GeographySection,
    Field(discriminator="type"),
]


@dataclass(frozen=True)
class SectionSchema:
    stored: type[SectionData]
    read: type[SectionBase]
    # Shown in the admin when choosing and editing blocks.
    label: str
    description: str


SECTION_SCHEMAS: dict[SectionType, SectionSchema] = {
    SectionType.hero: SectionSchema(
        stored=HeroData,
        read=HeroSection,
        label="Главный экран",
        description="Крупный заголовок, кнопки и фото; с образцами панелей — сетка образцов",
    ),
    SectionType.stats: SectionSchema(
        stored=StatsData,
        read=StatsSection,
        label="Цифры",
        description="Полоса ключевых показателей со счётчиками",
    ),
    SectionType.about_text: SectionSchema(
        stored=AboutTextData,
        read=AboutTextSection,
        label="Текст",
        description="Текст с форматированием и картинкой сбоку",
    ),
    SectionType.timeline: SectionSchema(
        stored=TimelineData,
        read=TimelineSection,
        label="История",
        description="Хронология событий по годам",
    ),
    SectionType.divisions_grid: SectionSchema(
        stored=DivisionsGridData,
        read=DivisionsGridSection,
        label="Направления",
        description="Карточки подразделений холдинга",
    ),
    SectionType.projects_showcase: SectionSchema(
        stored=ProjectsShowcaseData,
        read=ProjectsShowcaseSection,
        label="Избранные проекты",
        description="Крупный проект и список рядом",
    ),
    SectionType.project_list: SectionSchema(
        stored=ProjectListData,
        read=ProjectListSection,
        label="Список проектов",
        description="Все проекты с фильтром по статусу",
    ),
    SectionType.capabilities: SectionSchema(
        stored=CapabilitiesData,
        read=CapabilitiesSection,
        label="Преимущества",
        description="Сетка пунктов с иконками или картинками",
    ),
    SectionType.process_steps: SectionSchema(
        stored=ProcessStepsData,
        read=ProcessStepsSection,
        label="Этапы",
        description="Нумерованные этапы процесса",
    ),
    SectionType.production: SectionSchema(
        stored=ProductionData,
        read=ProductionSection,
        label="Производство",
        description="Текст, факты и галерея производства",
    ),
    SectionType.tokenization_explainer: SectionSchema(
        stored=TokenizationData,
        read=TokenizationSection,
        label="Токенизация",
        description="Как работает токенизация, преимущества и дисклеймер",
    ),
    SectionType.team_grid: SectionSchema(
        stored=TeamGridData,
        read=TeamGridSection,
        label="Команда",
        description="Основатель, руководство или вся команда",
    ),
    SectionType.clients_marquee: SectionSchema(
        stored=ClientsMarqueeData,
        read=ClientsMarqueeSection,
        label="Бегущая строка клиентов",
        description="Логотипы клиентов в движущейся ленте",
    ),
    SectionType.clients_grid: SectionSchema(
        stored=ClientsGridData,
        read=ClientsGridSection,
        label="Сетка клиентов",
        description="Логотипы клиентов с фильтром по отрасли",
    ),
    SectionType.testimonials: SectionSchema(
        stored=TestimonialsData,
        read=TestimonialsSection,
        label="Отзывы",
        description="Отзывы клиентов",
    ),
    SectionType.quote: SectionSchema(
        stored=QuoteData,
        read=QuoteSection,
        label="Цитата",
        description="Крупная цитата с фото автора",
    ),
    SectionType.cta: SectionSchema(
        stored=CtaData,
        read=CtaSection,
        label="Призыв к действию",
        description="Заголовок и кнопки, обычно на акцентном фоне",
    ),
    SectionType.contact_form: SectionSchema(
        stored=ContactFormData,
        read=ContactFormSection,
        label="Форма заявки",
        description="Форма с контактами компании",
    ),
    SectionType.media_gallery: SectionSchema(
        stored=MediaGalleryData,
        read=MediaGallerySection,
        label="Галерея",
        description="Сетка или лента изображений",
    ),
    SectionType.video: SectionSchema(
        stored=VideoData,
        read=VideoSection,
        label="Видео",
        description="Встроенное видео или видеофайл",
    ),
    SectionType.vacancies: SectionSchema(
        stored=VacanciesData,
        read=VacanciesSection,
        label="Вакансии",
        description="Список открытых вакансий",
    ),
    SectionType.geography: SectionSchema(
        stored=GeographyData,
        read=GeographySection,
        label="География",
        description="Страны поставок",
    ),
}
