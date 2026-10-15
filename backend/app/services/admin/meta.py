"""What the admin UI needs to know about the content model, from one source."""

from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.i18n import DEFAULT_LOCALE, Locale
from app.core.icons import ICON_NAMES
from app.models import Client, LeadStatus, UserRole
from app.repositories.admin.media import MediaRepository
from app.schemas.admin.collection_forms import (
    COLLECTION_FORMS,
    EMPLOYMENT_LABELS,
    PROJECT_STATUS_LABELS,
)
from app.schemas.admin.media import MediaForm
from app.schemas.admin.meta import (
    EntityTypeInfo,
    LocaleInfo,
    MediaLimits,
    Meta,
    Option,
    SectionTypeInfo,
)
from app.schemas.admin.pages import TONE_LABELS, PageForm, SectionForm
from app.schemas.admin.settings import SettingsForm
from app.schemas.refs import KeyKind, RefKind
from app.schemas.sections import LEAD_TYPE_LABELS, SECTION_SCHEMAS
from app.services.admin.media_files import MEDIA_TYPES, MediaKind
from app.services.admin.refs import RefService, ru
from app.storage.service import Storage

LOCALE_LABELS = {Locale.ru: "Русский", Locale.kk: "Қазақша", Locale.en: "English"}
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
USER_ROLE_LABELS = {UserRole.admin: "Администратор", UserRole.editor: "Редактор"}
# Every action the admin services write to the audit log (a test keeps the list complete).
AUDIT_ACTION_LABELS = {
    "create": "Создание",
    "update": "Изменение",
    "delete": "Удаление",
    "reorder": "Новый порядок",
    "publish": "Публикация",
    "unpublish": "Снятие с сайта",
    "discard_draft": "Сброс черновика",
    "restore": "Восстановление версии",
    "export": "Выгрузка CSV",
    "login": "Вход",
    "password_change": "Смена своего пароля",
    "password_reset": "Новый пароль от администратора",
}
# Every entity type in the audit log (a test keeps the list complete).
AUDIT_ENTITY_LABELS = {
    "page": "Страница",
    "section": "Блок",
    "media": "Файл",
    "division": "Направление",
    "project": "Проект",
    "person": "Сотрудник",
    "client": "Клиент",
    "timeline_event": "Событие истории",
    "stat": "Цифра",
    "vacancy": "Вакансия",
    "lead": "Заявка",
    "site_settings": "Настройки сайта",
    "admin_user": "Пользователь",
}
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
    settings: Settings,
    keys: Mapping[KeyKind, list[Option]],
    folders: list[str],
    industries: list[Option],
) -> Meta:
    """`keys`: current choices for key fields (RefService.key_options); `folders`: media
    folders; `industries`: client industries in use."""
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
        client_industries=industries,
        user_roles=options(USER_ROLE_LABELS),
        audit_actions=options(AUDIT_ACTION_LABELS),
        audit_entity_types=options(AUDIT_ENTITY_LABELS),
    )


async def load_meta(settings: Settings, session: AsyncSession, storage: Storage) -> Meta:
    """Meta with the current choices: division slugs, stats contexts, media folders."""
    keys = await RefService(session, storage).key_options()
    folders = [folder for folder, _ in await MediaRepository(session).folders() if folder]
    return build_meta(settings, keys, folders, await client_industries(session))


async def client_industries(session: AsyncSession) -> list[Option]:
    """Industry keys of the clients, labelled with the Russian name of the first client."""
    rows = await session.execute(
        select(Client.industry, Client.industry_label).order_by(
            Client.industry, Client.sort_order, Client.id
        )
    )
    labels: dict[str, str] = {}
    for industry, label in rows:
        labels.setdefault(industry, ru(label) or industry)
    return [Option(value=k, label=v) for k, v in labels.items()]


# Forms of entities that are not section blocks.
ENTITY_FORMS: dict[str, tuple[str, type[BaseModel]]] = {
    "media": ("Файл медиатеки", MediaForm),
    "page": ("Страница", PageForm),
    "section": ("Блок", SectionForm),
    **COLLECTION_FORMS,
    "site_settings": ("Настройки сайта", SettingsForm),
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
