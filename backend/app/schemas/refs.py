"""References from JSONB documents (section data, site settings) to entities.

A field annotated with `Ref` stores an id (or a list of ids). When the public API
renders the document, the id is replaced by the full entity under `Ref.target`,
and every `LocalizedText` is resolved to a string. This keeps section schemas
declarative: a new section type needs only its stored and read models.

    background_media_id: Annotated[UUID | None, Ref(RefKind.media, "background")] = None
"""

import uuid
from collections import defaultdict
from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema

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

    def __get_pydantic_json_schema__(
        self, core_schema: CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        """Mark the field for the admin UI: pick entities of `kind`, one or a list."""
        schema = handler(core_schema)
        schema["x-ref"] = {"kind": self.kind.value, "many": schema.get("type") == "array"}
        return schema


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


Loc = tuple[str | int, ...]


def iter_refs(model: BaseModel, path: Loc = ()) -> Iterator[tuple[Loc, RefKind, uuid.UUID]]:
    """Every referenced id with the path to its field, e.g. ("steps", 2, "media_id")."""
    for name in type(model).model_fields:
        value = getattr(model, name)
        ref = _ref_of(model, name)
        if ref is not None:
            if isinstance(value, list):
                for i, item in enumerate(value):
                    yield (*path, name, i), ref.kind, item
            elif value is not None:
                yield (*path, name), ref.kind, value
            continue
        if isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, BaseModel):
                    yield from iter_refs(item, (*path, name, i))
        elif isinstance(value, BaseModel):
            yield from iter_refs(value, (*path, name))


def iter_instances[T: BaseModel](
    model: BaseModel, cls: type[T], path: Loc = ()
) -> Iterator[tuple[Loc, T]]:
    """Every nested model of type `cls` with its path (used to find buttons and their links)."""
    for name in type(model).model_fields:
        value = getattr(model, name)
        items = enumerate(value) if isinstance(value, list) else [(None, value)]
        for i, item in items:
            if not isinstance(item, BaseModel):
                continue
            item_path: Loc = (*path, name) if i is None else (*path, name, i)
            if isinstance(item, cls):
                yield item_path, item
            yield from iter_instances(item, cls, item_path)
