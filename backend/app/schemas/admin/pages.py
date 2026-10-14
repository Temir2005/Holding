import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.i18n import LocalizedText, RequiredText
from app.schemas.admin.common import VersionedUpdate
from app.schemas.fields import field
from app.schemas.refs import MediaAccept, Ref, RefKind
from app.schemas.sections import SectionType, Tone

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
Slug = Annotated[
    str,
    Field(
        min_length=1,
        max_length=128,
        pattern=SLUG_PATTERN,
        description="Latin lowercase letters, digits and single dashes",
        examples=["smart-panels"],
    ),
]
ANCHOR_PATTERN = r"^[a-z][a-z0-9-]*$"
Anchor = Annotated[
    str,
    Field(
        max_length=64,
        pattern=ANCHOR_PATTERN,
        description="For links like #contacts; unique within the page",
    ),
]


class RefCard(BaseModel):
    """Short card of a referenced object, for pickers and previews in the admin."""

    id: uuid.UUID
    kind: str = Field(examples=["project", "media", "page"])
    title: str
    subtitle: str | None = None
    thumb_url: str | None = None
    is_published: bool | None = None
    slug: str | None = Field(
        default=None,
        description="Address key of pages, projects and divisions (for links and filters)",
    )


RefCards = dict[RefKind, dict[uuid.UUID, RefCard]]


# --- pages -----------------------------------------------------------------------


class PageCreate(BaseModel):
    """A new page starts as an unpublished draft; POST …/publish puts it on the site."""

    slug: Slug
    title: RequiredText
    seo_title: LocalizedText | None = None
    seo_description: LocalizedText | None = None
    og_image_id: uuid.UUID | None = None


class PageUpdate(VersionedUpdate):
    """Slug changes at once (it is the address). Title, SEO and og-image are draft:
    the site shows them after publishing."""

    not_null = frozenset({"slug", "title"})

    slug: Slug | None = None
    title: RequiredText | None = None
    seo_title: LocalizedText | None = None
    seo_description: LocalizedText | None = None
    og_image_id: uuid.UUID | None = None


class PageAdminRead(BaseModel):
    id: uuid.UUID
    slug: str
    title: dict[str, Any]
    seo_title: dict[str, Any]
    seo_description: dict[str, Any]
    og_image_id: uuid.UUID | None
    og_image: RefCard | None
    is_published: bool = Field(description="On the site; changed by publish / unpublish")
    published_revision_number: int | None = Field(
        description="The revision the site shows (kept when the page is taken down)"
    )
    published_at: datetime | None
    has_unpublished_changes: bool = Field(
        description="The draft differs from what the site shows (always true before the "
        "first publication)"
    )
    sort_order: int
    sections_count: int
    created_at: datetime
    updated_at: datetime
    version: int


# The picture shown when the page is shared in messengers and social networks.
OG_IMAGE_ACCEPT: tuple[MediaAccept, ...] = ("image",)


class PageForm(BaseModel):
    """The page's "settings and SEO" form (GET /admin/entity-types), saved with PageUpdate."""

    model_config = ConfigDict(extra="forbid", title="Страница")

    slug: Slug = field(
        "Адрес",
        description="Латиница, цифры и дефисы. Меняется на сайте сразу, без публикации",
    )
    title: RequiredText = field("Название", widget="localized-text")
    seo_title: LocalizedText | None = field(
        "SEO-заголовок",
        widget="localized-text",
        description="Заголовок во вкладке браузера и в поиске. Пусто — название страницы",
        default=None,
    )
    seo_description: LocalizedText | None = field(
        "SEO-описание", widget="localized-textarea", default=None
    )
    og_image_id: Annotated[uuid.UUID | None, Ref(RefKind.media, "og_image", OG_IMAGE_ACCEPT)] = (
        field("Картинка для соцсетей", default=None)
    )


# --- sections --------------------------------------------------------------------

TONE_LABELS = {Tone.dark: "Тёмный", Tone.light: "Светлый", Tone.accent: "Акцентный"}


class SectionForm(BaseModel):
    """Settings of a block around its data (GET /admin/entity-types), saved with SectionUpdate."""

    model_config = ConfigDict(extra="forbid", title="Блок")

    anchor: Anchor | None = field(
        "Якорь",
        widget="anchor",
        description="Для ссылок вида #contacts; уникален на странице",
        default=None,
    )
    tone: Tone = field("Фон блока", labels=TONE_LABELS, default=Tone.dark)
    is_visible: bool = field("Показывать на сайте", default=True)


class SectionCreate(BaseModel):
    type: SectionType
    data: dict[str, Any] = Field(
        default_factory=dict, description="Stored form; see GET /admin/section-types"
    )
    anchor: Anchor | None = None
    tone: Tone = Tone.dark
    is_visible: bool = True
    position: int | None = Field(
        default=None, ge=0, description="0-based place on the page; default: at the end"
    )


class SectionUpdate(VersionedUpdate):
    not_null = frozenset({"data", "tone", "is_visible"})

    data: dict[str, Any] | None = None
    anchor: Anchor | None = None
    tone: Tone | None = None
    is_visible: bool | None = None


class SectionAdminRead(BaseModel):
    id: uuid.UUID
    page_id: uuid.UUID
    type: SectionType
    label: str = Field(description="Block name in the admin, e.g. «Главный экран»")
    sort_order: int
    is_visible: bool
    anchor: str | None
    tone: Tone
    data: dict[str, Any] = Field(description="Stored form: every language, ids of references")
    refs: RefCards = Field(
        default_factory=dict, description="Cards of referenced objects, by kind and id"
    )
    updated_at: datetime
    version: int


class PageDetail(PageAdminRead):
    sections: list[SectionAdminRead]
    draft_hash: str = Field(description="Send it back to POST …/publish")


class SectionOrder(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, description="All section ids of the page, in order")
