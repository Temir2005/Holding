from typing import Any

from pydantic import BaseModel, Field


class Option(BaseModel):
    value: str
    label: str


class LocaleInfo(BaseModel):
    code: str
    label: str


class MediaLimits(BaseModel):
    image_mb: int
    video_mb: int
    types: list[str]


class Meta(BaseModel):
    """Everything the admin needs so it does not duplicate lists from the backend."""

    locales: list[LocaleInfo]
    default_locale: str
    project_statuses: list[Option]
    employment_types: list[Option]
    lead_types: list[Option]
    tones: list[Option]
    social_types: list[Option]
    icons: list[str]
    ref_kinds: list[str]
    section_types: list[Option]
    media: MediaLimits


class SectionTypeInfo(BaseModel):
    type: str
    label: str
    description: str
    schema_: dict[str, Any] = Field(
        alias="schema",
        serialization_alias="schema",
        description="JSON Schema of the stored data with x-widget, x-ref and x-enum-labels hints",
    )

    model_config = {"populate_by_name": True}
