"""Admin schemas of the collections: Create / Update / AdminRead for each, plus list filters.

Text fields are `LocalizedText` (every language as stored); references are ids, and the
read models add short cards of what they point to. Public `*Read` schemas are separate
(app.schemas.entities) and unchanged.
"""

import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, Field, HttpUrl

from app.core.i18n import LocalizedText
from app.models import EmploymentType, ProjectStatus
from app.schemas.admin.common import VersionedUpdate
from app.schemas.admin.pages import RefCard, Slug

L = LocalizedText
Url = Annotated[HttpUrl, Field(max_length=500)]
Year = Annotated[int, Field(ge=1900, le=2100)]
Tag = Annotated[str, Field(min_length=1, max_length=64)]


class Timestamps(BaseModel):
    id: uuid.UUID
    is_published: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
    version: int


class Testimonial(BaseModel):
    quote: L
    author: L
    position: L | None = None


class DivisionStatIn(BaseModel):
    value: float
    suffix: L | None = None
    label: L


# --- divisions ---------------------------------------------------------------------


class DivisionCreate(BaseModel):
    slug: Slug
    name: L
    tagline: L | None = None
    description: L | None = None
    logo_id: uuid.UUID | None = None
    cover_id: uuid.UUID | None = None
    stats: list[DivisionStatIn] = Field(default_factory=list, max_length=8)
    website_url: Url | None = None
    page_slug: str | None = Field(default=None, max_length=128, description="The division's page")
    is_published: bool = False


class DivisionUpdate(VersionedUpdate):
    slug: Slug | None = None
    name: L | None = None
    tagline: L | None = None
    description: L | None = None
    logo_id: uuid.UUID | None = None
    cover_id: uuid.UUID | None = None
    stats: list[DivisionStatIn] | None = Field(default=None, max_length=8)
    website_url: Url | None = None
    page_slug: str | None = Field(default=None, max_length=128)
    is_published: bool | None = None


class DivisionAdminRead(Timestamps):
    slug: str
    name: dict[str, Any]
    tagline: dict[str, Any]
    description: dict[str, Any]
    logo_id: uuid.UUID | None
    logo: RefCard | None
    cover_id: uuid.UUID | None
    cover: RefCard | None
    stats: list[dict[str, Any]]
    website_url: str | None
    page_slug: str | None


# --- projects ----------------------------------------------------------------------


class ProjectCreate(BaseModel):
    slug: Slug
    title: L
    division_id: uuid.UUID | None = None
    status: ProjectStatus = ProjectStatus.planned
    location: L | None = None
    year: Year | None = None
    area_m2: float | None = Field(default=None, ge=0)
    short_description: L | None = None
    body: L | None = Field(
        default=None, description="Markdown", json_schema_extra={"x-widget": "markdown"}
    )
    cover_id: uuid.UUID | None = None
    tags: list[Tag] = Field(default_factory=list, max_length=20)
    is_featured: bool = False
    is_tokenized: bool = False
    is_published: bool = False


class ProjectUpdate(VersionedUpdate):
    slug: Slug | None = None
    title: L | None = None
    division_id: uuid.UUID | None = None
    status: ProjectStatus | None = None
    location: L | None = None
    year: Year | None = None
    area_m2: float | None = Field(default=None, ge=0)
    short_description: L | None = None
    body: L | None = Field(default=None, json_schema_extra={"x-widget": "markdown"})
    cover_id: uuid.UUID | None = None
    tags: list[Tag] | None = Field(default=None, max_length=20)
    is_featured: bool | None = None
    is_tokenized: bool | None = None
    is_published: bool | None = None


class GalleryUpdate(VersionedUpdate):
    media_ids: list[uuid.UUID] = Field(max_length=60, description="Gallery images, in order")


class ProjectAdminRead(Timestamps):
    slug: str
    title: dict[str, Any]
    division_id: uuid.UUID | None
    division: RefCard | None
    status: ProjectStatus
    location: dict[str, Any]
    year: int | None
    area_m2: float | None
    short_description: dict[str, Any]
    body: dict[str, Any]
    cover_id: uuid.UUID | None
    cover: RefCard | None
    gallery: list[RefCard]
    tags: list[str]
    is_featured: bool
    is_tokenized: bool


class ProjectFilters(BaseModel):
    division_id: uuid.UUID | None = None
    status: ProjectStatus | None = None
    is_published: bool | None = None
    is_featured: bool | None = None


# --- people ------------------------------------------------------------------------


class PersonCreate(BaseModel):
    full_name: L
    position: L | None = None
    division_id: uuid.UUID | None = None
    bio: L | None = None
    photo_id: uuid.UUID | None = None
    linkedin_url: Url | None = None
    is_key: bool = False
    is_founder: bool = False
    is_published: bool = False


class PersonUpdate(VersionedUpdate):
    full_name: L | None = None
    position: L | None = None
    division_id: uuid.UUID | None = None
    bio: L | None = None
    photo_id: uuid.UUID | None = None
    linkedin_url: Url | None = None
    is_key: bool | None = None
    is_founder: bool | None = None
    is_published: bool | None = None


class PersonAdminRead(Timestamps):
    full_name: dict[str, Any]
    position: dict[str, Any]
    division_id: uuid.UUID | None
    division: RefCard | None
    bio: dict[str, Any]
    photo_id: uuid.UUID | None
    photo: RefCard | None
    linkedin_url: str | None
    is_key: bool
    is_founder: bool


class PersonFilters(BaseModel):
    division_id: uuid.UUID | None = None
    is_key: bool | None = None
    is_published: bool | None = None


# --- clients -----------------------------------------------------------------------


class ClientCreate(BaseModel):
    name: L
    logo_id: uuid.UUID | None = None
    industry: str = Field(
        min_length=1, max_length=64, pattern=r"^[a-z0-9_-]+$", description="Key for the filter"
    )
    industry_label: L
    description: L | None = None
    testimonial: Testimonial | None = None
    website_url: Url | None = None
    is_published: bool = False


class ClientUpdate(VersionedUpdate):
    name: L | None = None
    logo_id: uuid.UUID | None = None
    industry: str | None = Field(
        default=None, min_length=1, max_length=64, pattern=r"^[a-z0-9_-]+$"
    )
    industry_label: L | None = None
    description: L | None = None
    testimonial: Testimonial | None = None
    website_url: Url | None = None
    is_published: bool | None = None


class ClientAdminRead(Timestamps):
    name: dict[str, Any]
    logo_id: uuid.UUID | None
    logo: RefCard | None
    industry: str
    industry_label: dict[str, Any]
    description: dict[str, Any]
    testimonial: dict[str, Any] | None
    website_url: str | None


class ClientFilters(BaseModel):
    industry: str | None = Field(default=None, max_length=64)
    has_testimonial: bool | None = None
    is_published: bool | None = None


# --- timeline ----------------------------------------------------------------------


class TimelineEventCreate(BaseModel):
    year: Year
    title: L
    description: L | None = None
    image_id: uuid.UUID | None = None
    is_published: bool = False


class TimelineEventUpdate(VersionedUpdate):
    year: Year | None = None
    title: L | None = None
    description: L | None = None
    image_id: uuid.UUID | None = None
    is_published: bool | None = None


class TimelineEventAdminRead(Timestamps):
    year: int
    title: dict[str, Any]
    description: dict[str, Any]
    image_id: uuid.UUID | None
    image: RefCard | None


# --- stats -------------------------------------------------------------------------


class StatCreate(BaseModel):
    value: float
    prefix: str | None = Field(default=None, max_length=16)
    suffix: L | None = None
    label: L
    context: str = Field(
        min_length=1, max_length=64, pattern=r"^[a-z0-9_-]+$", examples=["home", "smart-panels"]
    )
    is_published: bool = False


class StatUpdate(VersionedUpdate):
    value: float | None = None
    prefix: str | None = Field(default=None, max_length=16)
    suffix: L | None = None
    label: L | None = None
    context: str | None = Field(default=None, min_length=1, max_length=64, pattern=r"^[a-z0-9_-]+$")
    is_published: bool | None = None


class StatAdminRead(Timestamps):
    value: float
    prefix: str | None
    suffix: dict[str, Any]
    label: dict[str, Any]
    context: str


class StatFilters(BaseModel):
    context: str | None = Field(default=None, max_length=64)
    is_published: bool | None = None


# --- vacancies ---------------------------------------------------------------------


class VacancyCreate(BaseModel):
    title: L
    division_id: uuid.UUID | None = None
    location: L | None = None
    employment_type: EmploymentType = EmploymentType.full_time
    description: L | None = None
    is_open: bool = True
    is_published: bool = False


class VacancyUpdate(VersionedUpdate):
    title: L | None = None
    division_id: uuid.UUID | None = None
    location: L | None = None
    employment_type: EmploymentType | None = None
    description: L | None = None
    is_open: bool | None = None
    is_published: bool | None = None


class VacancyAdminRead(Timestamps):
    title: dict[str, Any]
    division_id: uuid.UUID | None
    division: RefCard | None
    location: dict[str, Any]
    employment_type: EmploymentType
    description: dict[str, Any]
    is_open: bool


class VacancyFilters(BaseModel):
    division_id: uuid.UUID | None = None
    is_open: bool | None = None
    is_published: bool | None = None


class PublishedFilter(BaseModel):
    is_published: bool | None = None
