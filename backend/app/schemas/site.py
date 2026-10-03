"""Site settings: stored JSONB shapes and the localized read model."""

import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict

from app.core.i18n import LocalizedText
from app.schemas.entities import MediaRead
from app.schemas.refs import Ref, RefKind

# --- stored ---


class NavItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: LocalizedText
    page_slug: str | None = None
    anchor: str | None = None
    url: str | None = None


class Coordinates(BaseModel):
    lat: float
    lng: float


class Contacts(BaseModel):
    model_config = ConfigDict(extra="forbid")
    address: LocalizedText
    phones: list[str] = []
    email: str | None = None
    whatsapp: str | None = None
    hours: LocalizedText | None = None
    coordinates: Coordinates | None = None


class Social(BaseModel):
    type: str  # instagram, telegram, youtube, linkedin, facebook, whatsapp
    url: str


class Footer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: LocalizedText
    legal: LocalizedText


class DefaultSeo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: LocalizedText
    description: LocalizedText
    og_image_id: Annotated[uuid.UUID | None, Ref(RefKind.media, "og_image")] = None


class SiteSettingsDoc(BaseModel):
    """All JSONB parts of site_settings, validated together."""

    site_name: LocalizedText
    logo_id: Annotated[uuid.UUID | None, Ref(RefKind.media, "logo")] = None
    navigation: list[NavItem]
    contacts: Contacts
    socials: list[Social]
    footer: Footer
    default_seo: DefaultSeo


# --- read ---


class NavItemRead(BaseModel):
    label: str
    page_slug: str | None
    anchor: str | None
    url: str | None


class ContactsRead(BaseModel):
    address: str
    phones: list[str]
    email: str | None
    whatsapp: str | None
    hours: str | None
    coordinates: Coordinates | None


class FooterRead(BaseModel):
    text: str
    legal: str


class SeoRead(BaseModel):
    title: str
    description: str
    og_image: MediaRead | None


class SiteSettingsRead(BaseModel):
    site_name: str
    logo: MediaRead | None
    navigation: list[NavItemRead]
    contacts: ContactsRead
    socials: list[Social]
    footer: FooterRead
    default_seo: SeoRead
