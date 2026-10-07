"""What the admin UI needs to know about the content model, from one source."""

from collections.abc import Mapping
from typing import Any

from app.core.config import Settings
from app.core.i18n import DEFAULT_LOCALE, Locale
from app.core.icons import ICON_NAMES
from app.models import EmploymentType, ProjectStatus
from app.schemas.admin.meta import LocaleInfo, MediaLimits, Meta, Option, SectionTypeInfo
from app.schemas.refs import RefKind
from app.schemas.sections import LEAD_TYPE_LABELS, SECTION_SCHEMAS, Tone
from app.services.admin.media_files import MEDIA_TYPES

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


def build_meta(settings: Settings) -> Meta:
    return Meta(
        locales=[LocaleInfo(code=loc.value, label=LOCALE_LABELS[loc]) for loc in Locale],
        default_locale=DEFAULT_LOCALE.value,
        project_statuses=options(PROJECT_STATUS_LABELS),
        employment_types=options(EMPLOYMENT_LABELS),
        lead_types=options(LEAD_TYPE_LABELS),
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
    )


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
