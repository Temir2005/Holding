"""Content localization.

Localized fields are stored as JSONB `{"ru": ..., "kk": ..., "en": ...}`.
The public API resolves them to a single string with a fallback to Russian.
"""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class Locale(StrEnum):
    ru = "ru"
    kk = "kk"
    en = "en"


DEFAULT_LOCALE = Locale.ru


class LocalizedText(BaseModel):
    """A localized string inside section data and other JSONB documents."""

    ru: str
    kk: str | None = None
    en: str | None = None

    def resolve(self, locale: Locale) -> str:
        return resolve_text(self.model_dump(), locale) or ""


def resolve_text(value: dict[str, Any] | None, locale: Locale) -> str | None:
    """Pick the string for `locale`, falling back to the default locale."""
    if not value:
        return None
    text = value.get(locale.value) or value.get(DEFAULT_LOCALE.value)
    return text if isinstance(text, str) else None
