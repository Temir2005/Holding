"""Site settings: stored JSONB shapes and the localized read model."""

import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict

from app.core.i18n import LocalizedText
from app.schemas.entities import MediaRead
from app.schemas.fields import field
from app.schemas.refs import Ref, RefKind

# --- stored ---
# Titles and widgets are hints for the admin form; validation is what the public API uses.

L = LocalizedText


class NavItem(BaseModel):
    """A menu item: a page, an anchor (on that page or the current one) or an external URL."""

    model_config = ConfigDict(extra="forbid", title="Пункт меню")
    label: L = field("Текст пункта", widget="localized-text")
    page_slug: str | None = field("Страница", widget="page", default=None)
    anchor: str | None = field("Якорь", widget="anchor", default=None)
    url: str | None = field("Внешняя ссылка", description="https://…", default=None)


class Coordinates(BaseModel):
    model_config = ConfigDict(title="Координаты")
    lat: float = field("Широта")
    lng: float = field("Долгота")


class Contacts(BaseModel):
    model_config = ConfigDict(extra="forbid", title="Контакты")
    address: L = field("Адрес", widget="localized-textarea")
    phones: list[str] = field("Телефоны", default_factory=list)
    email: str | None = field("Email", default=None)
    whatsapp: str | None = field(
        "WhatsApp", description="Номер в международном формате", default=None
    )
    hours: L | None = field("Часы работы", widget="localized-text", default=None)
    coordinates: Coordinates | None = field("Точка на карте", default=None)


class Social(BaseModel):
    model_config = ConfigDict(title="Соцсеть")
    type: str = field("Соцсеть", options="social_types")
    url: str = field("Ссылка", description="https://…")


class Footer(BaseModel):
    model_config = ConfigDict(extra="forbid", title="Подвал")
    text: L = field("Текст", widget="localized-textarea")
    legal: L = field("Юридическая строка", widget="localized-text")


class DefaultSeo(BaseModel):
    model_config = ConfigDict(extra="forbid", title="SEO по умолчанию")
    title: L = field("Заголовок", widget="localized-text")
    description: L = field("Описание", widget="localized-textarea")
    og_image_id: Annotated[uuid.UUID | None, Ref(RefKind.media, "og_image")] = field(
        "Картинка для соцсетей", default=None
    )


class SiteSettingsDoc(BaseModel):
    """All JSONB parts of site_settings, validated together."""

    site_name: L = field("Название сайта", widget="localized-text")
    logo_id: Annotated[uuid.UUID | None, Ref(RefKind.media, "logo")] = field(
        "Логотип", default=None
    )
    navigation: list[NavItem] = field("Меню")
    contacts: Contacts = field("Контакты")
    socials: list[Social] = field("Соцсети")
    footer: Footer = field("Подвал")
    default_seo: DefaultSeo = field("SEO по умолчанию")


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
