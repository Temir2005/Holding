"""References from JSONB documents (section data, site settings) to entities.

A field annotated with `Ref` stores an id (or a list of ids). When the public API
renders the document, the id is replaced by the full entity under `Ref.target`,
and every `LocalizedText` is resolved to a string. This keeps section schemas
declarative: a new section type needs only its stored and read models.

    background_media_id: Annotated[UUID | None, Ref(RefKind.media, "background")] = None
"""

import uuid
from collections import defaultdict
from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from pydantic import BaseModel

from app.core.i18n import Locale, LocalizedText


class RefKind(StrEnum):
    media = "media"
    project = "project"
    person = "person"
    client = "client"
    division = "division"
    timeline_event = "timeline_event"
    stat = "stat"
    vacancy = "vacancy"


@dataclass(frozen=True)
class Ref:
    kind: RefKind
    target: str


RefIds = dict[RefKind, set[uuid.UUID]]
Loaded = Mapping[RefKind, Mapping[uuid.UUID, BaseModel]]


def _ref_of(model: BaseModel, field: str) -> Ref | None:
    info = type(model).model_fields[field]
    return next((m for m in info.metadata if isinstance(m, Ref)), None)


def collect_refs(model: BaseModel, into: RefIds | None = None) -> RefIds:
    """Gather every referenced id, grouped by entity kind, so they can be loaded in batches."""
    refs: RefIds = into if into is not None else defaultdict(set)
    for name in type(model).model_fields:
        value = getattr(model, name)
        ref = _ref_of(model, name)
        if ref is not None:
            ids = value if isinstance(value, list) else [value]
            refs[ref.kind].update(i for i in ids if i is not None)
        else:
            for item in value if isinstance(value, list) else [value]:
                if isinstance(item, BaseModel):
                    collect_refs(item, refs)
    return refs


def expand(model: BaseModel, locale: Locale, loaded: Loaded) -> dict[str, Any]:
    """Render a stored document: resolve localized text and swap ids for loaded entities.

    Ids that point to missing or unpublished entities are dropped silently, so a deleted
    project never breaks a page that still references it.
    """
    out: dict[str, Any] = {}
    for name in type(model).model_fields:
        value = getattr(model, name)
        ref = _ref_of(model, name)
        if ref is None:
            out[name] = _convert(value, locale, loaded)
            continue
        pool = loaded.get(ref.kind, {})
        if isinstance(value, list):
            out[ref.target] = [pool[i] for i in value if i in pool]
        else:
            out[ref.target] = pool.get(value) if value is not None else None
    return out


def _convert(value: Any, locale: Locale, loaded: Loaded) -> Any:
    if isinstance(value, LocalizedText):
        return value.resolve(locale)
    if isinstance(value, BaseModel):
        return expand(value, locale, loaded)
    if isinstance(value, list):
        return [_convert(v, locale, loaded) for v in value]
    return value
