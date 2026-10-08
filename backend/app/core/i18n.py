"""Content localization.

Localized fields are stored as JSONB `{"ru": ..., "kk": ..., "en": ...}`.
The public API resolves them to a single string with a fallback to Russian.
"""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Locale(StrEnum):
    ru = "ru"
    kk = "kk"
    en = "en"


DEFAULT_LOCALE = Locale.ru
LANGUAGES = frozenset(loc.value for loc in Locale)


class LocalizedText(BaseModel):
    """A localized string inside section data and other JSONB documents."""

    model_config = ConfigDict(title="Текст на трёх языках")

    ru: str = Field(title="Русский")
    kk: str | None = Field(default=None, title="Қазақша")
    en: str | None = Field(default=None, title="English")

    def resolve(self, locale: Locale) -> str:
        return resolve_text(self.model_dump(), locale) or ""


def resolve_text(value: dict[str, Any] | None, locale: Locale) -> str | None:
    """Pick the string for `locale`, falling back to the default locale."""
    if not value:
        return None
    text = value.get(locale.value) or value.get(DEFAULT_LOCALE.value)
    return text if isinstance(text, str) else None


def drop_empty_languages(value: Any) -> Any:
    """Keep only the languages that have text, in localized dicts at any depth.

    A dict whose keys are all languages is localized text; other dicts and lists are
    walked through. `{"ru": "Цех", "kk": None, "en": ""}` → `{"ru": "Цех"}`.
    Reading falls back to Russian, so a missing language is never shown as blank.
    """
    if isinstance(value, dict):
        if value and value.keys() <= LANGUAGES:
            return {k: v for k, v in value.items() if v}
        return {k: drop_empty_languages(v) for k, v in value.items()}
    if isinstance(value, list):
        return [drop_empty_languages(v) for v in value]
    return value
