"""Read models for entities, as the public API returns them (already localized)."""

import uuid

from pydantic import BaseModel

from app.models import EmploymentType, LeadType, ProjectStatus


class MediaPlaceholder(BaseModel):
    dominant_color: str | None = None
    blurhash: str | None = None


class MediaRead(BaseModel):
    id: uuid.UUID
    url: str
    width: int
    height: int
    alt: str
    mime_type: str
    placeholder: MediaPlaceholder


class StatRead(BaseModel):
    id: uuid.UUID
    value: float
    prefix: str | None
    suffix: str
    label: str


class TimelineEventRead(BaseModel):
    id: uuid.UUID
    year: int
    title: str
    description: str
    image: MediaRead | None


class DivisionStat(BaseModel):
    value: float
    suffix: str
    label: str


class DivisionRef(BaseModel):
    slug: str
    name: str


class DivisionRead(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    tagline: str
    description: str
    logo: MediaRead | None
    cover: MediaRead | None
    stats: list[DivisionStat]
    website_url: str | None
    page_slug: str | None


class ProjectCard(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    status: ProjectStatus
    location: str
    year: int | None
    area_m2: float | None
    short_description: str
    cover: MediaRead | None
    tags: list[str]
    is_featured: bool
    is_tokenized: bool
    division: DivisionRef | None


class ProjectRead(ProjectCard):
    body: str
    gallery: list[MediaRead]


class PersonRead(BaseModel):
    id: uuid.UUID
    full_name: str
    position: str
    bio: str
    photo: MediaRead | None
    linkedin_url: str | None
    is_key: bool
    is_founder: bool
    division: DivisionRef | None


class TestimonialRead(BaseModel):
    quote: str
    author: str
    position: str


class ClientRead(BaseModel):
    id: uuid.UUID
    name: str
    logo: MediaRead | None
    industry: str
    industry_label: str
    description: str
    testimonial: TestimonialRead | None
    website_url: str | None


class VacancyRead(BaseModel):
    id: uuid.UUID
    title: str
    location: str
    employment_type: EmploymentType
    description: str
    division: DivisionRef | None


__all__ = [
    "ClientRead",
    "DivisionRead",
    "DivisionRef",
    "DivisionStat",
    "EmploymentType",
    "LeadType",
    "MediaPlaceholder",
    "MediaRead",
    "PersonRead",
    "ProjectCard",
    "ProjectRead",
    "ProjectStatus",
    "StatRead",
    "TestimonialRead",
    "TimelineEventRead",
    "VacancyRead",
]
