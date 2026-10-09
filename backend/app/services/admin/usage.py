"""Where is an entity referenced? Used to refuse deleting something still in use.

Two kinds of references exist:
- foreign keys (project.cover_id, person.photo_id, ...): plain queries;
- ids inside JSONB documents (section data, site settings): parsed with the same
  schemas the API uses, then `collect_refs` lists every referenced id.

Sections are searched twice: in the draft and in the published snapshot of every page
that has one (even if the page is taken down now: publishing it again must not bring
back a deleted file). Older revisions do not count; restoring one that points at
something deleted is refused with a clear error.
"""

import logging
import uuid
from collections.abc import Sequence
from typing import Any, NamedTuple

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Client,
    Division,
    Page,
    PageRevision,
    Person,
    Project,
    ProjectMedia,
    Section,
    SiteSettings,
    TimelineEvent,
    Vacancy,
)
from app.schemas.admin.common import Usage
from app.schemas.admin.media import MediaUsage
from app.schemas.refs import KeyKind, RefKind, collect_refs, iter_instances, iter_keys
from app.schemas.revisions import PageSnapshot
from app.schemas.sections import SECTION_SCHEMAS, Cta, SectionType
from app.schemas.site import SiteSettingsDoc

log = logging.getLogger(__name__)


def _label(value: Any) -> str:
    """A localized JSON title → Russian text for messages."""
    if isinstance(value, dict):
        return str(value.get("ru") or next(iter(value.values()), ""))
    return str(value or "")


def links_to_page(href: str, slug: str) -> bool:
    return href.strip("/") == slug


class Block(NamedTuple):
    """A parsed section: from the draft, or from a page's published snapshot."""

    section_id: uuid.UUID
    data: Any
    page_slug: str
    type: str
    # Set for the published snapshot.
    revision_id: uuid.UUID | None = None

    @property
    def place(self) -> str:
        return f"Страница «{self.page_slug}», блок {self.type}"

    def usage(self, field: str, label: str) -> Usage:
        if self.revision_id is None:
            return Usage(entity_type="section", entity_id=self.section_id, field=field, label=label)
        return Usage(
            entity_type="page_revision",
            entity_id=self.revision_id,
            field=f"sections.{self.section_id}.{field}",
            label=f"{label} (опубликованная версия)",
        )


def parse_block(
    section_id: uuid.UUID, section_type: str, data: Any, slug: str, revision_id: uuid.UUID | None
) -> Block | None:
    try:
        stored = SECTION_SCHEMAS[SectionType(section_type)].stored.model_validate(data)
    except (ValueError, ValidationError):
        log.warning("usage scan: section %s has invalid data, skipped", section_id)
        return None
    return Block(section_id, stored, slug, section_type, revision_id)


class UsageFinder:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def page(self, slug: str) -> list[Usage]:
        """Menu items, buttons and divisions that link to the page with this slug."""
        found: list[Usage] = []
        settings = await self.session.scalar(select(SiteSettings).limit(1))
        if settings is not None:
            for i, item in enumerate(settings.navigation or []):
                if isinstance(item, dict) and item.get("page_slug") == slug:
                    found.append(
                        Usage(
                            entity_type="site_settings",
                            entity_id=settings.id,
                            field=f"navigation.{i}",
                            label=f"Меню: «{_label(item.get('label'))}»",
                        )
                    )
        for division_id, name in await self.session.execute(
            select(Division.id, Division.name).where(Division.page_slug == slug)
        ):
            found.append(
                Usage(
                    entity_type="division",
                    entity_id=division_id,
                    field="page_slug",
                    label=f"Направление «{_label(name)}»",
                )
            )
        for block in await self._blocks():
            for path, cta in iter_instances(block.data, Cta):
                if links_to_page(cta.href, slug):
                    found.append(
                        block.usage(
                            ".".join(map(str, ("data", *path, "href"))),
                            f"Кнопка «{cta.label.ru}» на странице «{block.page_slug}» "
                            f"({block.type})",
                        )
                    )
        return found

    async def entity(self, kind: RefKind, entity_id: uuid.UUID) -> list[Usage]:
        """Sections that reference this entity by id (project_ids, person_id, ...)."""
        return [
            block.usage("data", block.place)
            for block in await self._blocks()
            if entity_id in collect_refs(block.data).get(kind, set())
        ]

    async def division(self, division_id: uuid.UUID, slug: str) -> list[Usage]:
        """Projects, people and vacancies of the division, and blocks filtered by it."""
        found = await self.entity(RefKind.division, division_id)
        for model, entity_type, title in (
            (Project, "project", Project.title),
            (Person, "person", Person.full_name),
            (Vacancy, "vacancy", Vacancy.title),
        ):
            for row_id, name in await self.session.execute(
                select(model.id, title).where(model.division_id == division_id)
            ):
                found.append(
                    Usage(
                        entity_type=entity_type,
                        entity_id=row_id,
                        field="division_id",
                        label=f"{_label(name)}",
                    )
                )
        found += await self._keyed(KeyKind.division, slug)
        return found

    async def project(self, project_id: uuid.UUID, slug: str) -> list[Usage]:
        """Blocks listing the project and buttons linking to projects/<slug>."""
        found = await self.entity(RefKind.project, project_id)
        target = f"projects/{slug}"
        for block in await self._blocks():
            for path, cta in iter_instances(block.data, Cta):
                if links_to_page(cta.href, target):
                    found.append(
                        block.usage(
                            ".".join(map(str, ("data", *path, "href"))),
                            f"Кнопка «{cta.label.ru}» на странице «{block.page_slug}»",
                        )
                    )
        return found

    async def stat_context(self, context: str) -> list[Usage]:
        """Stats blocks that show the set of stats with this context."""
        return await self._keyed(KeyKind.stat_context, context)

    async def _keyed(self, kind: KeyKind, value: str) -> list[Usage]:
        """Blocks filtered by this key (a division slug, a stats context)."""
        return [
            block.usage(".".join(map(str, ("data", *path))), block.place)
            for block in await self._blocks()
            for path, key_kind, key in iter_keys(block.data)
            if key_kind == kind and key == value
        ]

    async def _blocks(self) -> list[Block]:
        """Draft sections of every page, then sections of every published snapshot."""
        blocks: list[Block] = []
        drafts = await self.session.execute(
            select(Section.id, Section.type, Section.data, Page.slug).join(
                Page, Page.id == Section.page_id
            )
        )
        for section_id, section_type, data, slug in drafts:
            if block := parse_block(section_id, section_type, data, slug, None):
                blocks.append(block)
        for revision_id, slug, snapshot in await self._published():
            for item in snapshot.sections:
                if block := parse_block(item.id, item.type, item.data, slug, revision_id):
                    blocks.append(block)
        return blocks

    async def _published(self) -> list[tuple[uuid.UUID, str, PageSnapshot]]:
        """The current revision of every page that has one."""
        rows = await self.session.execute(
            select(PageRevision.id, Page.slug, PageRevision.snapshot).join(
                Page, Page.published_revision_id == PageRevision.id
            )
        )
        out = []
        for revision_id, slug, snapshot in rows:
            try:
                out.append((revision_id, slug, PageSnapshot.model_validate(snapshot)))
            except ValidationError:
                log.warning("usage scan: revision %s has an unknown shape, skipped", revision_id)
        return out

    async def media(self, media_id: uuid.UUID) -> list[MediaUsage]:
        found: list[MediaUsage] = []
        fk_columns: Sequence[tuple[str, Any, Any, Any]] = (
            ("site_settings", SiteSettings, SiteSettings.logo_id, None),
            ("page", Page, Page.og_image_id, Page.title),
            ("division", Division, Division.logo_id, Division.name),
            ("division", Division, Division.cover_id, Division.name),
            ("project", Project, Project.cover_id, Project.title),
            ("person", Person, Person.photo_id, Person.full_name),
            ("client", Client, Client.logo_id, Client.name),
            ("timeline_event", TimelineEvent, TimelineEvent.image_id, TimelineEvent.title),
        )
        for entity_type, model, column, title in fk_columns:
            columns = [model.id] + ([title] if title is not None else [])
            for row in await self.session.execute(select(*columns).where(column == media_id)):
                found.append(
                    MediaUsage(
                        entity_type=entity_type,
                        entity_id=row[0],
                        field=column.key,
                        label=_label(row[1]) if title is not None else "Настройки сайта",
                    )
                )

        gallery = await self.session.execute(
            select(Project.id, Project.title)
            .join(ProjectMedia, ProjectMedia.project_id == Project.id)
            .where(ProjectMedia.media_id == media_id)
        )
        for project_id, title in gallery:
            found.append(
                MediaUsage(
                    entity_type="project",
                    entity_id=project_id,
                    field="gallery",
                    label=f"Галерея проекта «{_label(title)}»",
                )
            )

        found += await self._in_sections(RefKind.media, media_id)
        found += await self._in_settings(RefKind.media, media_id)
        return found

    async def _in_sections(self, kind: RefKind, target: uuid.UUID) -> list[MediaUsage]:
        found = [
            block.usage("data", block.place)
            for block in await self._blocks()
            if target in collect_refs(block.data).get(kind, set())
        ]
        if kind == RefKind.media:
            for revision_id, slug, snapshot in await self._published():
                if snapshot.page.og_image_id == target:
                    found.append(
                        MediaUsage(
                            entity_type="page_revision",
                            entity_id=revision_id,
                            field="page.og_image_id",
                            label=f"Страница «{slug}»: картинка для соцсетей "
                            "(опубликованная версия)",
                        )
                    )
        return found

    async def _in_settings(self, kind: RefKind, target: uuid.UUID) -> list[MediaUsage]:
        row = await self.session.scalar(select(SiteSettings).limit(1))
        if row is None:
            return []
        try:
            doc = SiteSettingsDoc.model_validate(
                {
                    "site_name": row.site_name,
                    "logo_id": row.logo_id,
                    "navigation": row.navigation,
                    "contacts": row.contacts,
                    "socials": row.socials,
                    "footer": row.footer,
                    "default_seo": row.default_seo,
                }
            )
        except ValidationError:
            log.warning("usage scan: site settings are invalid, skipped")
            return []
        refs = collect_refs(doc.default_seo).get(kind, set())
        if target not in refs:
            return []
        return [
            MediaUsage(
                entity_type="site_settings",
                entity_id=row.id,
                field="default_seo.og_image_id",
                label="Настройки сайта: картинка для соцсетей",
            )
        ]
