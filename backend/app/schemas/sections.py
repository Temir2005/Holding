"""Section types.

Each section type has two models:

* `<Name>Data`: what is stored in `section.data` (JSONB). Text is `LocalizedText`,
  entities are referenced by id through `Ref` annotations.
* `<Name>DataRead`: what the public API returns. Text is resolved for the requested
  locale and references are expanded into full entities (see app.schemas.refs).

The read envelopes (`HeroSection`, ...) form a discriminated union on `type`, which
the frontend receives as a typed union through the generated OpenAPI types.

Adding a section type: add the enum value, the two data models, the envelope, an
entry in SECTION_SCHEMAS and a React component in the frontend registry.
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
from app.schemas.refs import Ref, RefKind

L = LocalizedText


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
    eyebrow: L | None = None
    title: L | None = None


class SectionDataRead(BaseModel):
    eyebrow: str | None = None
    title: str | None = None


class Cta(Stored):
    label: L
    href: str
    variant: Literal["primary", "secondary"] = "primary"


class CtaRead(BaseModel):
    label: str
    href: str
    variant: Literal["primary", "secondary"]


class IconItem(Stored):
    icon: str
    title: L
    text: L
    media_id: Annotated[uuid.UUID | None, _media("media")] = None


class IconItemRead(BaseModel):
    icon: str
    title: str
    text: str
    media: MediaRead | None


# ---------------------------------------------------------------------------
# Section data: stored / read pairs
# ---------------------------------------------------------------------------


class Swatch(Stored):
    code: str
    label: L
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    finish: Literal["matte", "gloss", "texture"] = "matte"


class SwatchRead(BaseModel):
    code: str
    label: str
    color: str
    finish: Literal["matte", "gloss", "texture"]


class HeroData(SectionData):
    subtitle: L | None = None
    background_media_id: Annotated[uuid.UUID | None, _media("background")] = None
    video_media_id: Annotated[uuid.UUID | None, _media("video")] = None
    ctas: list[Cta] = []
    swatches: list[Swatch] = []


class HeroDataRead(SectionDataRead):
    subtitle: str | None = None
    background: MediaRead | None = None
    video: MediaRead | None = None
    ctas: list[CtaRead] = []
    swatches: list[SwatchRead] = []


class StatsData(SectionData):
    # Either explicit ids or a context ("home", "smart-panels"); explicit ids win.
    context: str | None = None
    stat_ids: Annotated[list[uuid.UUID], Ref(RefKind.stat, "stats")] = []


class StatsDataRead(SectionDataRead):
    stats: list[StatRead] = []


class AboutTextData(SectionData):
    body: L
    media_id: Annotated[uuid.UUID | None, _media("media")] = None
    layout: Literal["text_only", "media_left", "media_right"] = "text_only"


class AboutTextDataRead(SectionDataRead):
    body: str
    media: MediaRead | None = None
    layout: Literal["text_only", "media_left", "media_right"]


class TimelineData(SectionData):
    # Empty means every published event, ordered by year.
    event_ids: Annotated[list[uuid.UUID], Ref(RefKind.timeline_event, "events")] = []


class TimelineDataRead(SectionDataRead):
    events: list[TimelineEventRead] = []


class DivisionsGridData(SectionData):
    division_ids: Annotated[list[uuid.UUID], Ref(RefKind.division, "divisions")] = []


class DivisionsGridDataRead(SectionDataRead):
    divisions: list[DivisionRead] = []


class ProjectsShowcaseData(SectionData):
    # With `featured`, the list is every featured project; otherwise `project_ids`.
    featured: bool = False
    project_ids: Annotated[list[uuid.UUID], Ref(RefKind.project, "projects")] = []
    link: Cta | None = None


class ProjectsShowcaseDataRead(SectionDataRead):
    projects: list[ProjectCard] = []
    link: CtaRead | None = None


class ProjectListData(SectionData):
    # Live query: every published project, optionally limited to one division.
    division_slug: str | None = None
    show_filter: bool = True
    project_ids: Annotated[list[uuid.UUID], Ref(RefKind.project, "projects")] = []


class ProjectListDataRead(SectionDataRead):
    show_filter: bool
    projects: list[ProjectCard] = []


class CapabilitiesData(SectionData):
    intro: L | None = None
    items: list[IconItem] = []
    columns: Literal[2, 3, 4] = 3


class CapabilitiesDataRead(SectionDataRead):
    intro: str | None = None
    items: list[IconItemRead] = []
    columns: Literal[2, 3, 4]


class ProcessStep(Stored):
    title: L
    text: L
    media_id: Annotated[uuid.UUID | None, _media("media")] = None
    division_id: Annotated[uuid.UUID | None, Ref(RefKind.division, "division")] = None


class ProcessStepRead(BaseModel):
    title: str
    text: str
    media: MediaRead | None
    division: DivisionRead | None


class ProcessStepsData(SectionData):
    intro: L | None = None
    steps: list[ProcessStep] = []


class ProcessStepsDataRead(SectionDataRead):
    intro: str | None = None
    steps: list[ProcessStepRead] = []


class Fact(Stored):
    value: str
    label: L


class FactRead(BaseModel):
    value: str
    label: str


class ProductionData(SectionData):
    body: L
    facts: list[Fact] = []
    gallery_media_ids: Annotated[list[uuid.UUID], _media("gallery")] = []


class ProductionDataRead(SectionDataRead):
    body: str
    facts: list[FactRead] = []
    gallery: list[MediaRead] = []


class TokenizationData(SectionData):
    intro: L
    steps: list[IconItem] = []
    benefits: list[L] = []
    # Legal text is edited in the CMS; never hard-code yields or jurisdictions.
    disclaimer: L
    project_ids: Annotated[list[uuid.UUID], Ref(RefKind.project, "projects")] = []


class TokenizationDataRead(SectionDataRead):
    intro: str
    steps: list[IconItemRead] = []
    benefits: list[str] = []
    disclaimer: str
    projects: list[ProjectCard] = []


class TeamGridData(SectionData):
    intro: L | None = None
    # founder / key / rest: live queries; explicit ids override.
    mode: Literal["founder", "key", "rest", "all"] = "all"
    show_division_filter: bool = False
    person_ids: Annotated[list[uuid.UUID], Ref(RefKind.person, "people")] = []


class TeamGridDataRead(SectionDataRead):
    intro: str | None = None
    mode: Literal["founder", "key", "rest", "all"]
    show_division_filter: bool
    people: list[PersonRead] = []


class ClientsMarqueeData(SectionData):
    # Empty means every published client.
    client_ids: Annotated[list[uuid.UUID], Ref(RefKind.client, "clients")] = []


class ClientsMarqueeDataRead(SectionDataRead):
    clients: list[ClientRead] = []


class ClientsGridData(SectionData):
    show_industry_filter: bool = True
    client_ids: Annotated[list[uuid.UUID], Ref(RefKind.client, "clients")] = []


class ClientsGridDataRead(SectionDataRead):
    show_industry_filter: bool
    clients: list[ClientRead] = []


class TestimonialsData(SectionData):
    # Empty means every published client that has a testimonial.
    client_ids: Annotated[list[uuid.UUID], Ref(RefKind.client, "clients")] = []


class TestimonialsDataRead(SectionDataRead):
    clients: list[ClientRead] = []


class QuoteData(SectionData):
    text: L
    person_id: Annotated[uuid.UUID | None, Ref(RefKind.person, "person")] = None
    media_id: Annotated[uuid.UUID | None, _media("media")] = None


class QuoteDataRead(SectionDataRead):
    text: str
    person: PersonRead | None = None
    media: MediaRead | None = None


class CtaData(SectionData):
    text: L | None = None
    ctas: list[Cta] = []
    media_id: Annotated[uuid.UUID | None, _media("media")] = None


class CtaDataRead(SectionDataRead):
    text: str | None = None
    ctas: list[CtaRead] = []
    media: MediaRead | None = None


class ContactFormData(SectionData):
    text: L | None = None
    lead_types: list[LeadType] = [LeadType.partner]
    default_type: LeadType = LeadType.partner
    consent_text: L
    success_text: L


class ContactFormDataRead(SectionDataRead):
    text: str | None = None
    lead_types: list[LeadType]
    default_type: LeadType
    consent_text: str
    success_text: str


class MediaGalleryData(SectionData):
    media_ids: Annotated[list[uuid.UUID], _media("items")] = []
    layout: Literal["grid", "strip"] = "grid"


class MediaGalleryDataRead(SectionDataRead):
    items: list[MediaRead] = []
    layout: Literal["grid", "strip"]


class VideoData(SectionData):
    embed_url: str | None = None
    video_media_id: Annotated[uuid.UUID | None, _media("video")] = None
    poster_media_id: Annotated[uuid.UUID | None, _media("poster")] = None


class VideoDataRead(SectionDataRead):
    embed_url: str | None = None
    video: MediaRead | None = None
    poster: MediaRead | None = None


class VacanciesData(SectionData):
    intro: L | None = None
    # Live query: every open vacancy, optionally limited to one division.
    division_slug: str | None = None
    vacancy_ids: Annotated[list[uuid.UUID], Ref(RefKind.vacancy, "vacancies")] = []
    empty_text: L | None = None


class VacanciesDataRead(SectionDataRead):
    intro: str | None = None
    vacancies: list[VacancyRead] = []
    empty_text: str | None = None


class Country(Stored):
    code: str = Field(min_length=2, max_length=2)
    name: L
    note: L | None = None


class CountryRead(BaseModel):
    code: str
    name: str
    note: str | None


class GeographyData(SectionData):
    intro: L | None = None
    countries: list[Country] = []


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


SECTION_SCHEMAS: dict[SectionType, SectionSchema] = {
    SectionType.hero: SectionSchema(stored=HeroData, read=HeroSection),
    SectionType.stats: SectionSchema(stored=StatsData, read=StatsSection),
    SectionType.about_text: SectionSchema(stored=AboutTextData, read=AboutTextSection),
    SectionType.timeline: SectionSchema(stored=TimelineData, read=TimelineSection),
    SectionType.divisions_grid: SectionSchema(stored=DivisionsGridData, read=DivisionsGridSection),
    SectionType.projects_showcase: SectionSchema(
        stored=ProjectsShowcaseData, read=ProjectsShowcaseSection
    ),
    SectionType.project_list: SectionSchema(stored=ProjectListData, read=ProjectListSection),
    SectionType.capabilities: SectionSchema(stored=CapabilitiesData, read=CapabilitiesSection),
    SectionType.process_steps: SectionSchema(stored=ProcessStepsData, read=ProcessStepsSection),
    SectionType.production: SectionSchema(stored=ProductionData, read=ProductionSection),
    SectionType.tokenization_explainer: SectionSchema(
        stored=TokenizationData, read=TokenizationSection
    ),
    SectionType.team_grid: SectionSchema(stored=TeamGridData, read=TeamGridSection),
    SectionType.clients_marquee: SectionSchema(
        stored=ClientsMarqueeData, read=ClientsMarqueeSection
    ),
    SectionType.clients_grid: SectionSchema(stored=ClientsGridData, read=ClientsGridSection),
    SectionType.testimonials: SectionSchema(stored=TestimonialsData, read=TestimonialsSection),
    SectionType.quote: SectionSchema(stored=QuoteData, read=QuoteSection),
    SectionType.cta: SectionSchema(stored=CtaData, read=CtaSection),
    SectionType.contact_form: SectionSchema(stored=ContactFormData, read=ContactFormSection),
    SectionType.media_gallery: SectionSchema(stored=MediaGalleryData, read=MediaGallerySection),
    SectionType.video: SectionSchema(stored=VideoData, read=VideoSection),
    SectionType.vacancies: SectionSchema(stored=VacanciesData, read=VacanciesSection),
    SectionType.geography: SectionSchema(stored=GeographyData, read=GeographySection),
}
