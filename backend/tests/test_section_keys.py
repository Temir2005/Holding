"""Filters stored by key rather than id: the division slug of project and vacancy lists,
the context of a stats block. A key that matches nothing is refused when saving."""

from typing import Any

import pytest
from httpx import AsyncClient

from app.models import AdminUser
from tests.conftest import auth_header
from tests.test_pages_admin import PAGES, add_section, make_page

ADMIN = "/api/v1/admin"


def error_locs(body: dict[str, Any]) -> list[list[str | int]]:
    assert body["error"]["code"] == "VALIDATION_ERROR", body
    return [e["loc"] for e in body["error"]["details"]]


@pytest.mark.parametrize("section_type", ["project_list", "vacancies"])
async def test_division_filter_must_name_a_division(
    client: AsyncClient, editor: AdminUser, section_type: str
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)

    res = await client.post(
        f"{PAGES}/{page['id']}/sections", headers=h,
        json={"type": section_type, "data": {"division_slug": "smart-panels"}},
    )  # fmt: skip
    assert res.status_code == 422
    assert error_locs(res.json()) == [["body", "data", "division_slug"]]
    assert "smart-panels" in res.json()["error"]["details"][0]["msg"]

    division = await client.post(
        f"{ADMIN}/divisions", headers=h, json={"slug": "smart-panels", "name": {"ru": "Панели"}}
    )
    assert division.status_code == 201
    section = await add_section(
        client, h, page["id"], {"type": section_type, "data": {"division_slug": "smart-panels"}}
    )
    assert section["data"]["division_slug"] == "smart-panels"
    # No filter at all is fine: the block shows every division.
    await add_section(client, h, page["id"], {"type": section_type, "data": {}})


async def test_stats_context_needs_at_least_one_stat(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)

    res = await client.post(
        f"{PAGES}/{page['id']}/sections", headers=h,
        json={"type": "stats", "data": {"context": "home"}},
    )  # fmt: skip
    assert error_locs(res.json()) == [["body", "data", "context"]]

    stat = await client.post(
        f"{ADMIN}/stats", headers=h, json={"value": 20, "label": {"ru": "лет"}, "context": "home"}
    )
    assert stat.status_code == 201
    stats_block = {"type": "stats", "data": {"context": "home"}}
    section = await add_section(client, h, page["id"], stats_block)

    # Editing the block later checks the key again.
    res = await client.patch(
        f"{ADMIN}/sections/{section['id']}", headers=h,
        json={"version": section["version"], "data": {"context": "about"}},
    )  # fmt: skip
    assert error_locs(res.json()) == [["body", "data", "context"]]


async def test_key_fields_are_dropdowns_with_choices_in_meta(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    division = {"slug": "dev", "name": {"ru": "Девелопмент"}}
    await client.post(f"{ADMIN}/divisions", headers=h, json=division)
    for context in ("home", "smart-panels", "home"):
        await client.post(
            f"{ADMIN}/stats", headers=h, json={"value": 1, "label": {"ru": "x"}, "context": context}
        )

    meta = (await client.get(f"{ADMIN}/meta", headers=h)).json()
    assert meta["divisions"] == [{"value": "dev", "label": "Девелопмент"}]
    assert [o["value"] for o in meta["stat_contexts"]] == ["home", "smart-panels"]

    listed = (await client.get(f"{ADMIN}/section-types", headers=h)).json()
    types = {t["type"]: t["schema"] for t in listed}
    context = types["stats"]["properties"]["context"]
    assert (context["x-widget"], context["x-options"]) == ("select", "stat_contexts")
    for section_type in ("project_list", "vacancies"):
        slug = types[section_type]["properties"]["division_slug"]
        assert (slug["x-widget"], slug["x-options"]) == ("select", "divisions")


async def make_stat(client: AsyncClient, h: dict[str, str], context: str) -> dict[str, Any]:
    body = {"value": 1, "label": {"ru": "x"}, "context": context}
    res = await client.post(f"{ADMIN}/stats", headers=h, json=body)
    assert res.status_code == 201, res.text
    return dict(res.json())


async def test_last_stat_of_a_used_context_is_kept(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    first = await make_stat(client, h, "home")
    await add_section(client, h, page["id"], {"type": "stats", "data": {"context": "home"}})

    moved = await client.patch(
        f"{ADMIN}/stats/{first['id']}", headers=h, json={"version": 1, "context": "about"}
    )
    assert moved.status_code == 409
    assert moved.json()["error"]["code"] == "IN_USE"
    assert [u["field"] for u in moved.json()["error"]["details"]] == ["data.context"]
    deleted = await client.delete(f"{ADMIN}/stats/{first['id']}", headers=h, params={"version": 1})
    assert deleted.json()["error"]["code"] == "IN_USE"

    # With another stat left in the set, both are allowed.
    second = await make_stat(client, h, "home")
    moved = await client.patch(
        f"{ADMIN}/stats/{first['id']}", headers=h, json={"version": 1, "context": "about"}
    )
    assert moved.status_code == 200, moved.text
    # Now `second` is the last one of "home".
    gone = await client.delete(f"{ADMIN}/stats/{second['id']}", headers=h, params={"version": 1})
    assert gone.json()["error"]["code"] == "IN_USE"
    gone = await client.delete(f"{ADMIN}/stats/{first['id']}", headers=h, params={"version": 2})
    assert gone.status_code == 204


async def test_unused_context_is_free(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    stat = await make_stat(client, h, "unused")
    moved = await client.patch(
        f"{ADMIN}/stats/{stat['id']}", headers=h, json={"version": 1, "context": "other"}
    )
    assert moved.status_code == 200
    gone = await client.delete(f"{ADMIN}/stats/{stat['id']}", headers=h, params={"version": 2})
    assert gone.status_code == 204
