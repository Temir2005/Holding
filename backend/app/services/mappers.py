"""ORM rows → localized read models."""

from decimal import Decimal
from typing import Any

from app.core.i18n import Locale, resolve_text
from app.models import Client, Division, Media, Person, Project, Stat, TimelineEvent, Vacancy
from app.schemas.entities import (
    ClientRead,
    DivisionRead,
    DivisionRef,
    DivisionStat,
    MediaPlaceholder,
    MediaRead,
    PersonRead,
    ProjectCard,
    ProjectRead,
    StatRead,
    TestimonialRead,
    TimelineEventRead,
    VacancyRead,
)
from app.storage.service import StorageService


class Mapper:
    def __init__(self, locale: Locale, storage: StorageService) -> None:
        self.locale = locale
        self.storage = storage

    def t(self, value: dict[str, Any] | None) -> str:
        return resolve_text(value, self.locale) or ""

    def t_opt(self, value: dict[str, Any] | None) -> str | None:
        return resolve_text(value, self.locale)

    @staticmethod
    def num(value: Decimal | None) -> float | None:
        return float(value) if value is not None else None

    def media(self, m: Media | None) -> MediaRead | None:
        if m is None:
            return None
        return MediaRead(
            id=m.id,
            url=self.storage.public_url(m.s3_key, m.bucket),
            width=m.width,
            height=m.height,
            alt=self.t(m.alt),
            mime_type=m.mime_type,
            placeholder=MediaPlaceholder(dominant_color=m.dominant_color, blurhash=m.blurhash),
        )

    def division_ref(self, d: Division | None) -> DivisionRef | None:
        return DivisionRef(slug=d.slug, name=self.t(d.name)) if d else None

    def division(self, d: Division) -> DivisionRead:
        return DivisionRead(
            id=d.id,
            slug=d.slug,
            name=self.t(d.name),
            tagline=self.t(d.tagline),
            description=self.t(d.description),
            logo=self.media(d.logo),
            cover=self.media(d.cover),
            stats=[
                DivisionStat(
                    value=float(s["value"]),
                    suffix=self.t(s.get("suffix")),
                    label=self.t(s["label"]),
                )
                for s in d.stats
            ],
            website_url=d.website_url,
            page_slug=d.page_slug,
        )

    def project_card(self, p: Project) -> ProjectCard:
        return ProjectCard(
            id=p.id,
            slug=p.slug,
            title=self.t(p.title),
            status=p.status,
            location=self.t(p.location),
            year=p.year,
            area_m2=self.num(p.area_m2),
            short_description=self.t(p.short_description),
            cover=self.media(p.cover),
            tags=list(p.tags),
            is_featured=p.is_featured,
            is_tokenized=p.is_tokenized,
            division=self.division_ref(p.division),
        )

    def project(self, p: Project) -> ProjectRead:
        gallery = [m for m in (self.media(item.media) for item in p.gallery) if m]
        return ProjectRead(
            **self.project_card(p).model_dump(), body=self.t(p.body), gallery=gallery
        )

    def person(self, p: Person) -> PersonRead:
        return PersonRead(
            id=p.id,
            full_name=self.t(p.full_name),
            position=self.t(p.position),
            bio=self.t(p.bio),
            photo=self.media(p.photo),
            linkedin_url=p.linkedin_url,
            is_key=p.is_key,
            is_founder=p.is_founder,
            division=self.division_ref(p.division),
        )

    def client(self, c: Client) -> ClientRead:
        tm = c.testimonial
        return ClientRead(
            id=c.id,
            name=self.t(c.name),
            logo=self.media(c.logo),
            industry=c.industry,
            industry_label=self.t(c.industry_label),
            description=self.t(c.description),
            testimonial=TestimonialRead(
                quote=self.t(tm.get("quote")),
                author=self.t(tm.get("author")),
                position=self.t(tm.get("position")),
            )
            if tm
            else None,
            website_url=c.website_url,
        )

    def timeline_event(self, e: TimelineEvent) -> TimelineEventRead:
        return TimelineEventRead(
            id=e.id,
            year=e.year,
            title=self.t(e.title),
            description=self.t(e.description),
            image=self.media(e.image),
        )

    def stat(self, s: Stat) -> StatRead:
        return StatRead(
            id=s.id,
            value=float(s.value),
            prefix=s.prefix,
            suffix=self.t(s.suffix),
            label=self.t(s.label),
        )

    def vacancy(self, v: Vacancy) -> VacancyRead:
        return VacancyRead(
            id=v.id,
            title=self.t(v.title),
            location=self.t(v.location),
            employment_type=v.employment_type,
            description=self.t(v.description),
            division=self.division_ref(v.division),
        )
