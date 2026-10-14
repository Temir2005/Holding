"""What the admin UI needs to know about the content model, from one source."""

from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.i18n import DEFAULT_LOCALE, Locale
from app.core.icons import ICON_NAMES
from app.models import EmploymentType, LeadStatus, ProjectStatus
from app.repositories.admin.media import MediaRepository
from app.schemas.admin.media import MediaForm
from app.schemas.admin.meta import (
    EntityTypeInfo,
    LocaleInfo,
    MediaLimits,
    Meta,
    Option,
    SectionTypeInfo,
)
from app.schemas.refs import KeyKind, RefKind
from app.schemas.sections import LEAD_TYPE_LABELS, SECTION_SCHEMAS, Tone
from app.services.admin.media_files import MEDIA_TYPES, MediaKind
from app.services.admin.refs import RefService
from app.storage.service import Storage

LOCALE_LABELS = {Locale.ru: "Русский", Locale.kk: "Қазақша", Locale.en: "English"}
PROJECT_STATUS_LABELS = {
    ProjectStatus.completed: "Реализован",
    ProjectStatus.in_progress: "Строится",
    ProjectStatus.planned: "В планах",
}
EMPLOYMENT_LABELS = {
    EmploymentType.full_time: "Полная занятость",
    EmploymentType.part_time: "Частичная занятость",
    EmploymentType.contract: "Контракт",
    EmploymentType.internship: "Стажировка",
}
LEAD_STATUS_LABELS = {
    LeadStatus.new: "Новая",
    LeadStatus.in_progress: "В работе",
    LeadStatus.done: "Обработана",
    LeadStatus.spam: "Спам",
}
MEDIA_KIND_LABELS = {
    MediaKind.image: "Изображения",
    MediaKind.svg: "SVG",
    MediaKind.video: "Видео",
    MediaKind.document: "Документы",
}
TONE_LABELS = {Tone.dark: "Тёмный", Tone.light: "Светлый", Tone.accent: "Акцентный"}
# Social link types the site knows how to show (validated when settings are saved).
SOCIAL_TYPES = {
    "instagram": "Instagram",
    "telegram": "Telegram",
    "whatsapp": "WhatsApp",
    "youtube": "YouTube",
    "facebook": "Facebook",
    "linkedin": "LinkedIn",
    "tiktok": "TikTok",
    "vk": "ВКонтакте",
}


def options(labels: Mapping[Any, str]) -> list[Option]:
    return [Option(value=str(k), label=v) for k, v in labels.items()]


def build_meta(
    settings: Settings, keys: Mapping[KeyKind, list[Option]], folders: list[str]
) -> Meta:
    """`keys`: current choices for key fields (RefService.key_options); `folders`: media folders."""
    return Meta(
        locales=[LocaleInfo(code=loc.value, label=LOCALE_LABELS[loc]) for loc in Locale],
        default_locale=DEFAULT_LOCALE.value,
        project_statuses=options(PROJECT_STATUS_LABELS),
        employment_types=options(EMPLOYMENT_LABELS),
        lead_types=options(LEAD_TYPE_LABELS),
        lead_statuses=options(LEAD_STATUS_LABELS),
        tones=options(TONE_LABELS),
        social_types=options(SOCIAL_TYPES),
        icons=list(ICON_NAMES),
        ref_kinds=[k.value for k in RefKind],
        section_types=[Option(value=t.value, label=s.label) for t, s in SECTION_SCHEMAS.items()],
        media=MediaLimits(
            image_mb=settings.media_max_image_mb,
            video_mb=settings.media_max_video_mb,
            types=sorted(MEDIA_TYPES),
        ),
        divisions=keys[KeyKind.division],
        stat_contexts=keys[KeyKind.stat_context],
        media_kinds=options(MEDIA_KIND_LABELS),
        media_folders=[Option(value=f, label=f) for f in folders],
    )


async def load_meta(settings: Settings, session: AsyncSession, storage: Storage) -> Meta:
    """Meta with the current choices: division slugs, stats contexts, media folders."""
    keys = await RefService(session, storage).key_options()
    folders = [folder for folder, _ in await MediaRepository(session).folders() if folder]
    return build_meta(settings, keys, folders)


# Forms of entities that are not section blocks; collections, pages and settings come next.
ENTITY_FORMS: dict[str, tuple[str, type[BaseModel]]] = {
    "media": ("Файл медиатеки", MediaForm),
}


def entity_types() -> list[EntityTypeInfo]:
    return [
        EntityTypeInfo(type=name, label=label, schema_=model.model_json_schema())
        for name, (label, model) in ENTITY_FORMS.items()
    ]


def section_types() -> list[SectionTypeInfo]:
    return [
        SectionTypeInfo(
            type=t.value,
            label=s.label,
            description=s.description,
            schema_=s.stored.model_json_schema(),
        )
        for t, s in SECTION_SCHEMAS.items()
    ]
