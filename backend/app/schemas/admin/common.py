"""Shapes shared by every admin endpoint: errors, paginated lists, list parameters."""

import uuid
from typing import Any

from pydantic import BaseModel, Field

MAX_PAGE_SIZE = 100


class ErrorBody(BaseModel):
    code: str = Field(examples=["VERSION_CONFLICT"])
    message: str
    details: Any = None


class ErrorEnvelope(BaseModel):
    """Every admin error looks like this; `code` is stable, `message` is for people."""

    error: ErrorBody


class FieldError(BaseModel):
    loc: list[str | int]
    msg: str


def error_responses(*statuses: int) -> dict[int | str, dict[str, Any]]:
    """OpenAPI `responses` entry documenting the error envelope for the given statuses."""
    return {status: {"model": ErrorEnvelope} for status in statuses}


class Paginated[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int


class ListParams(BaseModel):
    """Common list query: paging, free-text search, sort by a whitelisted field.

    `sort` is a field name, with a leading "-" for descending order.
    """

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=MAX_PAGE_SIZE)
    q: str | None = Field(default=None, max_length=200)
    sort: str | None = Field(default=None, max_length=64)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class VersionedUpdate(BaseModel):
    """Base for every Update schema: the client sends back the version it edited."""

    version: int = Field(
        ge=1, description="Version the client read; a stale one gets 409 VERSION_CONFLICT"
    )


class ReorderRequest(BaseModel):
    ids: list[uuid.UUID] = Field(
        min_length=1, description="All ids of the collection in the new order"
    )
