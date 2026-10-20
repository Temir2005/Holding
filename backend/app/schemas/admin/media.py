import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.i18n import LocalizedText
from app.models import MediaStatus
from app.schemas.admin.common import Usage, VersionedUpdate
from app.schemas.entities import MediaVariant
from app.schemas.fields import field

Folder = str

# A focal point coordinate: 0..1 from the left (x) or the top (y).
Coordinate = Annotated[float, Field(ge=0, le=1)]
FOCAL_HINT = "Точка, которая остаётся в кадре при обрезке. 0.5 — центр"
FOCAL_FIELDS = ("focal_point_x", "focal_point_y")


class UploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255, description="Original file name")
    content_type: str = Field(max_length=64, examples=["image/jpeg"])
    size_bytes: int = Field(gt=0, description="Declared size; the real size is checked on complete")
    folder: str | None = Field(default=None, max_length=128)
    alt: LocalizedText | None = None


class UploadTarget(BaseModel):
    """Where the browser sends the file: `PUT url` with exactly these headers and the raw body."""

    url: str
    method: str = "PUT"
    headers: dict[str, str]
    expires_in: int


class MediaAdminRead(BaseModel):
    id: uuid.UUID
    url: str
    status: MediaStatus
    original_filename: str | None
    folder: str | None
    tags: list[str]
    mime_type: str
    size_bytes: int
    width: int
    height: int
    alt: dict[str, str] = Field(description="All languages, as stored")
    dominant_color: str | None
    focal_point_x: float | None = None
    focal_point_y: float | None = None
    variants: list[MediaVariant]
    uploaded_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    version: int


class UploadTicket(BaseModel):
    media: MediaAdminRead
    upload: UploadTarget


class CompletedUpload(BaseModel):
    media: MediaAdminRead
    warnings: list[str] = Field(description="Things the editor should know, e.g. SVG was cleaned")


class MediaUpdate(VersionedUpdate):
    alt: LocalizedText | None = None
    folder: str | None = Field(default=None, max_length=128)
    tags: list[str] | None = Field(default=None, max_length=30)
    original_filename: str | None = Field(default=None, min_length=1, max_length=255)
    focal_point_x: Coordinate | None = None
    focal_point_y: Coordinate | None = None

    @model_validator(mode="after")
    def _focal_point_whole(self) -> Self:
        """Both coordinates come together: set both, or clear both with null."""
        sent = self.model_fields_set & set(FOCAL_FIELDS)
        if not sent:
            return self
        values = [getattr(self, f) for f in FOCAL_FIELDS]
        if len(sent) == 1 or (None in values and values != [None, None]):
            raise ValueError(
                "фокус задаётся двумя координатами: укажите и по горизонтали, и по вертикали "
                "или оставьте обе пустыми"
            )
        return self


class MediaForm(BaseModel):
    """Editable fields of a media file, as the admin card shows them (GET /admin/entity-types).

    Saved with PATCH /admin/media/{id} (`MediaUpdate`); a test keeps the two in step.
    """

    model_config = ConfigDict(extra="forbid", title="Файл")

    alt: LocalizedText | None = field(
        "Подпись (alt)",
        widget="localized-text",
        description="Что изображено: её читают незрячие посетители и поисковики",
        default=None,
    )
    original_filename: str | None = field("Имя файла", default=None, min_length=1, max_length=255)
    folder: str | None = field(
        "Папка", widget="combobox", options="media_folders", default=None, max_length=128
    )
    tags: list[str] = field("Теги", widget="tags", default_factory=list, max_length=30)
    focal_point_x: Coordinate | None = field(
        "Фокус по горизонтали (0–1)", description=FOCAL_HINT, default=None
    )
    focal_point_y: Coordinate | None = field(
        "Фокус по вертикали (0–1)", description=FOCAL_HINT, default=None
    )


# Kept as a name for the media endpoints; the shape is shared.
MediaUsage = Usage


class FolderCount(BaseModel):
    folder: str | None
    count: int
