"""Content localization.

Localized fields are stored as JSONB `{"ru": ..., "kk": ..., "en": ...}`.
The public API resolves them to a single string with a fallback to Russian.
"""

from collections.abc import Iterator
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class RequiredText(LocalizedText):
    """Localized text of a required field (a title, a name): Russian must have text.

    `LocalizedText` itself accepts an empty string, because section data and settings
    already stored with one must keep rendering on the public site.
    """

    ru: str = Field(title="Русский", min_length=1)

    @field_validator("ru")
    @classmethod
    def has_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("заполните текст на русском")
        return value


def empty_required_texts(
    model: BaseModel, path: tuple[str | int, ...] = ()
) -> Iterator[tuple[str | int, ...]]:
    """Paths to required localized fields (no default) whose Russian text is blank.

    For JSONB documents (section data, settings), whose models also read stored data
    and so accept an empty string; the admin refuses to save one.
    """
    for name, info in type(model).model_fields.items():
        value = getattr(model, name)
        items = enumerate(value) if isinstance(value, list) else [(None, value)]
        for i, item in items:
            item_path = (*path, name) if i is None else (*path, name, i)
            if isinstance(item, LocalizedText):
                if (i is not None or info.is_required()) and not item.ru.strip():
                    yield (*item_path, "ru")
            elif isinstance(item, BaseModel):
                yield from empty_required_texts(item, item_path)


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
