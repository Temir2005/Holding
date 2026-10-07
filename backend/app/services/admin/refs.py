"""References from stored documents (section data, settings) to entities.

- `check`: every id in a `Ref` field must exist (media must be fully uploaded),
  and every internal link in a button must lead to an existing page or project.
  The public API silently skips broken references; the admin refuses to save them.
- `cards`: short cards of referenced objects, so the admin can show what is picked.
- `lookup`: search for the entity picker.
"""

import re
import uuid
from collections import defaultdict
from collections.abc import Iterable, Sequence
from typing import Any

from pydantic import BaseModel
from sqlalchemy import String, cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationFailed
from app.models import (
    Client,
    Division,
    Media,
    MediaStatus,
    Page,
    Person,
    Project,
    Stat,
    TimelineEvent,
    Vacancy,
)
from app.repositories.admin.base import like_pattern
from app.schemas.admin.pages import RefCard, RefCards
from app.schemas.refs import Loc, RefKind, iter_instances, iter_refs
from app.schemas.sections import Cta
from app.storage.service import Storage

ENTITY_MODELS: dict[RefKind, Any] = {
    RefKind.media: Media,
    RefKind.project: Project,
    RefKind.person: Person,
    RefKind.client: Client,
    RefKind.division: Division,
    RefKind.timeline_event: TimelineEvent,
    RefKind.stat: Stat,
    RefKind.vacancy: Vacancy,
}

KIND_LABELS = {
    RefKind.media: "файл",
    RefKind.project: "проект",
    RefKind.person: "человек",
    RefKind.client: "клиент",
    RefKind.division: "направление",
    RefKind.timeline_event: "событие истории",
    RefKind.stat: "цифра",
    RefKind.vacancy: "вакансия",
}

EXTERNAL_LINK = re.compile(r"^(https?://|mailto:|tel:)")


def ru(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("ru") or "")
    return str(value or "")


# Columns searched by the picker, per kind ("page" is for link targets).
SEARCH_COLUMNS: dict[str, tuple[Any, ...]] = {
    RefKind.media: (Media.original_filename, Media.alt),
    RefKind.project: (Project.title, Project.slug),
    RefKind.person: (Person.full_name, Person.position),
    RefKind.client: (Client.name,),
    RefKind.division: (Division.name, Division.slug),
    RefKind.timeline_event: (TimelineEvent.title, TimelineEvent.year),
    RefKind.stat: (Stat.label, Stat.context),
    RefKind.vacancy: (Vacancy.title,),
    "page": (Page.slug, Page.title),
}


class RefService:
    def __init__(self, session: AsyncSession, storage: Storage) -> None:
        self.session = session
        self.storage = storage

    # --- validation ------------------------------------------------------------------

    async def check(self, doc: BaseModel, loc: Loc) -> None:
        """Raise ValidationFailed listing every broken reference and link, with field paths."""
        errors = await self.ref_errors(doc, loc) + await self.link_errors(doc, loc)
        if errors:
            raise ValidationFailed("Есть ссылки на несуществующие объекты", details=errors)

    async def ref_errors(self, doc: BaseModel, loc: Loc) -> list[dict[str, Any]]:
        found = list(iter_refs(doc))
        by_kind: dict[RefKind, set[uuid.UUID]] = defaultdict(set)
        for _, kind, ref_id in found:
            by_kind[kind].add(ref_id)
        existing = {kind: await self.existing(kind, ids) for kind, ids in by_kind.items()}
        return [
            {
                "loc": [*loc, *path],
                "msg": f"{KIND_LABELS[kind]} не найден: {ref_id}"
                if kind != RefKind.media
                else f"файл не найден или не загружен до конца: {ref_id}",
            }
            for path, kind, ref_id in found
            if ref_id not in existing[kind]
        ]

    async def existing(self, kind: RefKind, ids: Iterable[uuid.UUID]) -> set[uuid.UUID]:
        ids = set(ids)
        if not ids:
            return set()
        model = ENTITY_MODELS[kind]
        stmt = select(model.id).where(model.id.in_(ids))
        if kind == RefKind.media:
            stmt = stmt.where(Media.status == MediaStatus.ready)
        return set(await self.session.scalars(stmt))

    async def link_errors(self, doc: BaseModel, loc: Loc) -> list[dict[str, Any]]:
        buttons = list(iter_instances(doc, Cta))
        if not buttons:
            return []
        hrefs = [(path, cta.href) for path, cta in buttons]
        return await self.href_errors(hrefs, loc)

    async def href_errors(
        self, hrefs: Sequence[tuple[Loc, str]], loc: Loc, *, field: str = "href"
    ) -> list[dict[str, Any]]:
        """Internal links: "page-slug" must be a page, "projects/<slug>" a project."""
        page_slugs = {h for _, h in hrefs if self.is_internal(h) and "/" not in h.strip("/")}
        project_slugs = {
            h.strip("/").split("/", 1)[1]
            for _, h in hrefs
            if self.is_internal(h) and h.strip("/").startswith("projects/")
        }
        pages = (
            set(await self.session.scalars(select(Page.slug).where(Page.slug.in_(page_slugs))))
            if page_slugs
            else set()
        )
        projects = (
            set(
                await self.session.scalars(
                    select(Project.slug).where(Project.slug.in_(project_slugs))
                )
            )
            if project_slugs
            else set()
        )
        errors = []
        for path, href in hrefs:
            if not self.is_internal(href):
                continue
            target = href.strip("/")
            if target.startswith("projects/"):
                if target.split("/", 1)[1] not in projects:
                    errors.append({"loc": [*loc, *path, field], "msg": f"нет проекта «{target}»"})
            elif "/" in target or target not in pages:
                errors.append({"loc": [*loc, *path, field], "msg": f"нет страницы «{target}»"})
        return errors

    @staticmethod
    def is_internal(href: str) -> bool:
        return not (href.startswith("#") or EXTERNAL_LINK.match(href))

    # --- cards -----------------------------------------------------------------------

    async def cards(self, doc: BaseModel | None) -> RefCards:
        if doc is None:
            return {}
        by_kind: dict[RefKind, set[uuid.UUID]] = defaultdict(set)
        for _, kind, ref_id in iter_refs(doc):
            by_kind[kind].add(ref_id)
        out: RefCards = {}
        for kind, ids in by_kind.items():
            rows = await self.session.scalars(
                select(ENTITY_MODELS[kind]).where(ENTITY_MODELS[kind].id.in_(ids))
            )
            out[kind] = {row.id: self.card(kind, row) for row in rows}
        return out

    def media_thumb(self, media: Media | None) -> str | None:
        if media is None or not media.mime_type.startswith("image/"):
            return None
        smallest = media.variants[0]["key"] if media.variants else media.s3_key
        return self.storage.public_url(smallest, media.bucket)

    def card(self, kind: RefKind, row: Any) -> RefCard:
        published = getattr(row, "is_published", None)
        match kind:
            case RefKind.media:
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=row.original_filename or ru(row.alt) or row.s3_key.rsplit("/", 1)[-1],
                    subtitle=f"{row.width}×{row.height}" if row.width else row.mime_type,
                    thumb_url=self.media_thumb(row),
                )
            case RefKind.project:
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=ru(row.title),
                    subtitle=ru(row.location) or None,
                    thumb_url=self.media_thumb(row.cover),
                    is_published=published,
                )
            case RefKind.person:
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=ru(row.full_name),
                    subtitle=ru(row.position) or None,
                    thumb_url=self.media_thumb(row.photo),
                    is_published=published,
                )
            case RefKind.client:
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=ru(row.name),
                    subtitle=ru(row.industry_label) or None,
                    thumb_url=self.media_thumb(row.logo),
                    is_published=published,
                )
            case RefKind.division:
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=ru(row.name),
                    subtitle=ru(row.tagline) or None,
                    thumb_url=self.media_thumb(row.cover),
                    is_published=published,
                )
            case RefKind.timeline_event:
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=f"{row.year} — {ru(row.title)}",
                    thumb_url=self.media_thumb(row.image),
                    is_published=published,
                )
            case RefKind.stat:
                value = f"{row.prefix or ''}{row.value.normalize():f}{ru(row.suffix)}"
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=f"{value} {ru(row.label)}".strip(),
                    subtitle=row.context,
                    is_published=published,
                )
            case RefKind.vacancy:
                return RefCard(
                    id=row.id,
                    kind=kind,
                    title=ru(row.title),
                    subtitle=ru(row.location) or None,
                    is_published=published,
                )
        raise AssertionError(kind)

    # --- picker ----------------------------------------------------------------------

    async def lookup(
        self, kind: str, *, q: str | None, ids: Sequence[uuid.UUID], limit: int
    ) -> list[RefCard]:
        """Search for the picker. `kind` is a RefKind or "page" (for link targets)."""
        model = Page if kind == "page" else ENTITY_MODELS[RefKind(kind)]
        stmt = select(model)
        if ids:
            stmt = stmt.where(model.id.in_(ids))
        if q:
            pattern = like_pattern(q)
            stmt = stmt.where(or_(*(cast(c, String).ilike(pattern) for c in SEARCH_COLUMNS[kind])))
        if kind == RefKind.media:
            stmt = stmt.where(Media.status == MediaStatus.ready).order_by(Media.created_at.desc())
        elif hasattr(model, "sort_order"):
            stmt = stmt.order_by(model.sort_order)
        rows = await self.session.scalars(stmt.limit(limit))
        if kind == "page":
            return [
                RefCard(
                    id=p.id,
                    kind="page",
                    title=ru(p.title),
                    subtitle=p.slug,
                    is_published=p.is_published,
                )
                for p in rows
            ]
        return [self.card(RefKind(kind), row) for row in rows]
