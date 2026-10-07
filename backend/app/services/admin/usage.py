"""Where is an entity referenced? Used to refuse deleting something still in use.

Two kinds of references exist:
- foreign keys (project.cover_id, person.photo_id, ...): plain queries;
- ids inside JSONB documents (section data, site settings): parsed with the same
  schemas the API uses, then `collect_refs` lists every referenced id.
"""

import logging
import uuid
from collections.abc import Sequence
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Client,
    Division,
    Page,
    Person,
    Project,
    ProjectMedia,
    Section,
    SiteSettings,
    TimelineEvent,
)
from app.schemas.admin.common import Usage
from app.schemas.admin.media import MediaUsage
from app.schemas.refs import RefKind, collect_refs, iter_instances
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
        for section_id, stored, page_slug, section_type in await self._parsed_sections():
            for path, cta in iter_instances(stored, Cta):
                if links_to_page(cta.href, slug):
                    found.append(
                        Usage(
                            entity_type="section",
                            entity_id=section_id,
                            field=".".join(map(str, ("data", *path, "href"))),
                            label=(
                                f"Кнопка «{cta.label.ru}» на странице «{page_slug}» "
                                f"({section_type})"
                            ),
                        )
                    )
        return found

    async def _parsed_sections(self) -> list[tuple[uuid.UUID, Any, str, str]]:
        rows = await self.session.execute(
            select(Section.id, Section.type, Section.data, Page.slug).join(
                Page, Page.id == Section.page_id
            )
        )
        parsed = []
        for section_id, section_type, data, slug in rows:
            try:
                stored = SECTION_SCHEMAS[SectionType(section_type)].stored.model_validate(data)
            except (ValueError, ValidationError):
                log.warning("usage scan: section %s has invalid data, skipped", section_id)
                continue
            parsed.append((section_id, stored, slug, section_type))
        return parsed

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
        found = []
        for section_id, stored, slug, section_type in await self._parsed_sections():
            if target in collect_refs(stored).get(kind, set()):
                found.append(
                    MediaUsage(
                        entity_type="section",
                        entity_id=section_id,
                        field="data",
                        label=f"Страница «{slug}», блок {section_type}",
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
