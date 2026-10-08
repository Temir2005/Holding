"""Field helpers for stored models: Russian titles plus hints for the admin UI.

The hints end up in the JSON Schema of GET /admin/section-types, so the admin can
build an editing form for any section without knowing it in advance:

- `x-widget`: localized-text | localized-textarea | markdown | icon | link | color | anchor
- `x-ref`: {kind, many}, added by `Ref` itself (app.schemas.refs)
- `x-widget: select` + `x-options`: a dropdown whose choices are the GET /admin/meta list
  of that name, added by `KeyOf` (division slugs, stats contexts)
- `x-enum-labels`: {value: label} for choice fields
- `x-widget: page`: a page picker (GET /admin/lookup?kind=page); the value is the slug
"""

from collections.abc import Mapping
from typing import Annotated, Any

from pydantic import AfterValidator, Field, WithJsonSchema

from app.core.icons import ICON_NAMES


def field(
    title: str,
    *,
    widget: str | None = None,
    labels: Mapping[Any, str] | None = None,
    options: str | None = None,
    description: str | None = None,
    **kwargs: Any,
) -> Any:
    """`Field` with a Russian title and optional UI hints. Other kwargs pass through.

    `options` names a list in GET /admin/meta to choose from (a dropdown).
    """
    extra: dict[str, Any] = {}
    if widget:
        extra["x-widget"] = widget
    if options:
        extra["x-widget"] = "select"
        extra["x-options"] = options
    if labels:
        extra["x-enum-labels"] = {str(k): v for k, v in labels.items()}
    if extra:
        kwargs["json_schema_extra"] = extra
    # Without extras, json_schema_extra is not passed at all: a None here would erase hints
    # that the field's type already carries (LinkHref, HexColor).
    return Field(title=title, description=description, **kwargs)


def _known_icon(name: str) -> str:
    if name not in ICON_NAMES:
        raise ValueError(f"Неизвестная иконка «{name}»")
    return name


IconName = Annotated[
    str,
    AfterValidator(_known_icon),
    WithJsonSchema({"type": "string", "enum": list(ICON_NAMES), "x-widget": "icon"}),
]

# Link targets in CMS buttons: "https://…", "#anchor", "page-slug" or "projects/<slug>".
LinkHref = Annotated[
    str, Field(min_length=1, max_length=500, json_schema_extra={"x-widget": "link"})
]

HexColor = Annotated[
    str, Field(pattern=r"^#[0-9a-fA-F]{6}$", json_schema_extra={"x-widget": "color"})
]
