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


class KeyKind(StrEnum):
    """Keys of other content stored by value rather than by id."""

    division = "division"  # a division's slug
    stat_context = "stat_context"  # the context of a set of stats ("home", "smart-panels")


# Name of the list in GET /admin/meta that offers the existing keys of each kind.
KEY_OPTIONS = {KeyKind.division: "divisions", KeyKind.stat_context: "stat_contexts"}


@dataclass(frozen=True)
class KeyOf:
    """A field holding a key of other content (a division slug, a stats context).

    Live queries filter by these keys. The admin refuses keys that match nothing and
    shows a dropdown: `x-options` names the list of choices in GET /admin/meta.
    """

    kind: KeyKind

    def __get_pydantic_json_schema__(
        self, core_schema: CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        schema = handler(core_schema)
        schema["x-widget"] = "select"
        schema["x-options"] = KEY_OPTIONS[self.kind]
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


def iter_marked[K](
    model: BaseModel, marker: type[K], path: Loc = ()
) -> Iterator[tuple[Loc, K, Any]]:
    """Every value of a field annotated with `marker` (Ref, KeyOf), with its path.

    Lists yield one item per element; empty values (None) are skipped.
    """
    for name, info in type(model).model_fields.items():
        value = getattr(model, name)
        mark = next((m for m in info.metadata if isinstance(m, marker)), None)
        if mark is not None:
            if isinstance(value, list):
                for i, item in enumerate(value):
                    yield (*path, name, i), mark, item
            elif value is not None:
                yield (*path, name), mark, value
            continue
        if isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, BaseModel):
                    yield from iter_marked(item, marker, (*path, name, i))
        elif isinstance(value, BaseModel):
            yield from iter_marked(value, marker, (*path, name))


def iter_refs(model: BaseModel, path: Loc = ()) -> Iterator[tuple[Loc, RefKind, uuid.UUID]]:
    """Every referenced id with the path to its field, e.g. ("steps", 2, "media_id")."""
    for loc, ref, ref_id in iter_marked(model, Ref, path):
        yield loc, ref.kind, ref_id


def iter_keys(model: BaseModel, path: Loc = ()) -> Iterator[tuple[Loc, KeyKind, str]]:
    """Every non-empty key (division slug, stats context) with the path to its field."""
    for loc, key, value in iter_marked(model, KeyOf, path):
        if value:
            yield loc, key.kind, value


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
