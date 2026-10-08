"""Site settings: name, logo, menu, contacts, socials, footer, default SEO.

One row, created by the seeds; the admin reads it and replaces it as a whole (PUT)
with a version check. The document is validated with the same models the public
API reads it with (app.schemas.site); the checks that only make sense when saving
(menu targets exist, known social networks, required texts filled) live here,
so the public site keeps rendering whatever is already stored.
"""

import re
import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFound
from app.models import SiteSettings
from app.repositories.admin.site import SettingsRepository
from app.schemas.admin.pages import ANCHOR_PATTERN, SLUG_PATTERN
from app.schemas.admin.settings import SettingsAdminRead, SettingsUpdate
from app.schemas.refs import Loc
from app.schemas.site import SiteSettingsDoc
from app.services.admin.audit import AuditWriter
from app.services.admin.base import Before, CrudService
from app.services.admin.meta import SOCIAL_TYPES
from app.services.admin.refs import EXTERNAL_LINK, RefService
from app.storage.service import Storage

BODY: Loc = ("body",)
# JSONB columns, one per part of the document.
JSON_PARTS = ("site_name", "navigation", "contacts", "socials", "footer", "default_seo")
WEB_LINK = re.compile(r"^https?://\S+$")
ANCHOR = re.compile(ANCHOR_PATTERN)
SLUG = re.compile(SLUG_PATTERN)


def document(row: SiteSettings) -> SiteSettingsDoc:
    return SiteSettingsDoc.model_validate(
        {"logo_id": row.logo_id, **{part: getattr(row, part) for part in JSON_PARTS}}
    )


def menu_errors(doc: SiteSettingsDoc) -> tuple[list[dict[str, Any]], list[tuple[Loc, str]]]:
    """Shape of each menu item; returns the errors and the page slugs to look up."""
    errors: list[dict[str, Any]] = []
    pages: list[tuple[Loc, str]] = []
    for i, item in enumerate(doc.navigation):
        loc = [*BODY, "navigation", i]
        if not (item.page_slug or item.anchor or item.url):
            errors.append({"loc": loc, "msg": "укажите страницу, якорь или внешнюю ссылку"})
        if item.url and (item.page_slug or item.anchor):
            errors.append({"loc": [*loc, "url"], "msg": "внешняя ссылка — без страницы и якоря"})
        if item.url and not EXTERNAL_LINK.match(item.url):
            errors.append({"loc": [*loc, "url"], "msg": "ссылка должна начинаться с https://"})
        if item.anchor and not ANCHOR.match(item.anchor):
            errors.append(
                {"loc": [*loc, "anchor"], "msg": "латинские строчные буквы, цифры и дефис"}
            )
        if item.page_slug and not SLUG.match(item.page_slug):
            errors.append(
                {
                    "loc": [*loc, "page_slug"],
                    "msg": "адрес страницы, например about или smart-panels",
                }
            )
        elif item.page_slug:
            pages.append((("navigation", i), item.page_slug))
    return errors, pages


def social_errors(doc: SiteSettingsDoc) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    for i, social in enumerate(doc.socials):
        loc = [*BODY, "socials", i]
        if social.type not in SOCIAL_TYPES:
            errors.append({"loc": [*loc, "type"], "msg": f"неизвестная соцсеть «{social.type}»"})
        if not WEB_LINK.match(social.url):
            errors.append({"loc": [*loc, "url"], "msg": "ссылка должна начинаться с https://"})
    return errors


class SettingsService(CrudService[SiteSettings, SettingsUpdate, SettingsUpdate, SettingsAdminRead]):
    entity_type = "site_settings"
    entity_label = "Настройки сайта"

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        self.settings = SettingsRepository(session)
        super().__init__(session, self.settings, audit)
        self.refs = RefService(session, storage)

    # --- CrudService hooks ---------------------------------------------------------

    def build(self, data: SettingsUpdate) -> SiteSettings:
        raise NotImplementedError("The settings row is created by the seeds")

    def changes(self, data: SettingsUpdate) -> dict[str, Any]:
        # PUT replaces the whole document, including parts the client left at defaults.
        return data.model_dump(exclude={"version"})

    def apply(self, obj: SiteSettings, changes: dict[str, Any]) -> None:
        doc = SiteSettingsDoc.model_validate(changes)
        # Stored the way the seeds store it: no keys for empty optional values.
        stored = doc.model_dump(mode="json", exclude_none=True)
        obj.logo_id = doc.logo_id
        for part in JSON_PARTS:
            setattr(obj, part, stored[part])

    async def validate(self, obj: SiteSettings, before: Before) -> None:
        doc = document(obj)
        errors, pages = menu_errors(doc)
        errors += await self.refs.href_errors(pages, BODY, field="page_slug")
        errors += social_errors(doc)
        await self.refs.check(doc, BODY, extra=errors)

    async def present_many(self, rows: Sequence[SiteSettings]) -> list[SettingsAdminRead]:
        reads = []
        for row in rows:
            doc = document(row)
            # Normalized like sections: every field with its default, so the form is complete.
            stored = doc.model_dump(mode="json")
            reads.append(
                SettingsAdminRead(
                    id=row.id,
                    logo_id=row.logo_id,
                    **{part: stored[part] for part in JSON_PARTS},
                    refs=await self.refs.cards(doc),
                    updated_at=row.updated_at,
                    version=row.version,
                )
            )
        return reads

    # --- the single row ------------------------------------------------------------

    async def _row_id(self) -> uuid.UUID:
        row = await self.settings.the_row()
        if row is None:
            raise NotFound("Настройки сайта ещё не созданы: запустите наполнение (make seed)")
        return row.id

    async def current(self) -> SettingsAdminRead:
        return await self.read(await self._row_id())

    async def replace(self, data: SettingsUpdate) -> SettingsAdminRead:
        return await self.update(await self._row_id(), data)
