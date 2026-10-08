"""Site settings in the admin: the whole document, read and replaced at once."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.admin.common import VersionedUpdate
from app.schemas.admin.pages import RefCards
from app.schemas.site import SiteSettingsDoc


class SettingsUpdate(SiteSettingsDoc, VersionedUpdate):
    """PUT: every part of the document is replaced; send back what GET returned, edited."""

    model_config = ConfigDict(title="Настройки сайта")


class SettingsAdminRead(BaseModel):
    """Every part as stored (all languages, ids), plus cards of the referenced files."""

    id: uuid.UUID
    site_name: dict[str, Any]
    logo_id: uuid.UUID | None
    navigation: list[dict[str, Any]]
    contacts: dict[str, Any]
    socials: list[dict[str, Any]]
    footer: dict[str, Any]
    default_seo: dict[str, Any]
    refs: RefCards = Field(
        default_factory=dict, description="Cards of referenced objects, by kind and id"
    )
    updated_at: datetime
    version: int
