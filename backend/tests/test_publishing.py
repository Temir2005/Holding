"""Publishing: drafts are not public, history, rollback, preview, conflicts, caching."""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, create_preview_token
from app.models import AdminUser, AuditLog, Page, PageRevision, Section
from app.storage.memory import InMemoryStorage
from tests.conftest import auth_header
from tests.test_pages_admin import (
    PAGES,
    SECTIONS,
    add_section,
    make_page,
    publish_page,
    ready_media,
)

PUBLIC = "/api/v1/pages"


def hero(title: str) -> dict[str, Any]:
    return {"type": "hero", "data": {"title": {"ru": title}}}


async def public_titles(client: AsyncClient, slug: str) -> list[str] | None:
    res = await client.get(f"{PUBLIC}/{slug}")
    if res.status_code == 404:
        return None
    return [s["data"]["title"] for s in res.json()["sections"]]


async def detail(client: AsyncClient, h: dict[str, str], page_id: str) -> dict[str, Any]:
    return dict((await client.get(f"{PAGES}/{page_id}", headers=h)).json())


async def edit_title(
    client: AsyncClient, h: dict[str, str], section: dict[str, Any], title: str
) -> dict[str, Any]:
    current = (await client.get(f"{SECTIONS}/{section['id']}", headers=h)).json()
    res = await client.patch(
        f"{SECTIONS}/{section['id']}",
        headers=h,
        json={"version": current["version"], "data": {"title": {"ru": title}}},
    )
    assert res.status_code == 200, res.text
    return dict(res.json())


async def test_draft_preview_publish_history_and_rollback(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h, "about")
    section = await add_section(client, h, page["id"], hero("Первая версия"))

    # A new page is a draft: not on the site.
    assert await public_titles(client, "about") is None
    fresh = await detail(client, h, page["id"])
    assert (fresh["is_published"], fresh["has_unpublished_changes"]) == (False, True)
    assert fresh["published_revision_number"] is None

    first = await publish_page(client, h, page["id"], "Запуск")
    assert (first["published_revision_number"], first["has_unpublished_changes"]) == (1, False)
    assert await public_titles(client, "about") == ["Первая версия"]

    # Editing changes the draft only; preview shows it, the site does not.
    await edit_title(client, h, section, "Вторая версия")
    assert await public_titles(client, "about") == ["Первая версия"]
    assert (await detail(client, h, page["id"]))["has_unpublished_changes"] is True
    link = (await client.post(f"{PAGES}/{page['id']}/preview-token", headers=h)).json()
    preview = await client.get(link["path"])
    assert preview.status_code == 200
    assert preview.headers["cache-control"] == "no-store"
    assert [s["data"]["title"] for s in preview.json()["sections"]] == ["Вторая версия"]
    assert preview.json().keys() == (await client.get(f"{PUBLIC}/about")).json().keys()

    second = await publish_page(client, h, page["id"], "Новый заголовок")
    assert second["published_revision_number"] == 2
    assert await public_titles(client, "about") == ["Вторая версия"]

    history = (await client.get(f"{PAGES}/{page['id']}/revisions", headers=h)).json()
    assert [(r["number"], r["comment"], r["is_current"]) for r in history] == [
        (2, "Новый заголовок", True),
        (1, "Запуск", False),
    ]
    assert history[0]["created_by"]["email"] == editor.email
    one = (await client.get(f"{PAGES}/{page['id']}/revisions/1", headers=h)).json()
    assert one["snapshot"]["sections"][0]["data"]["title"]["ru"] == "Первая версия"

    # Rollback: revision 1 becomes the draft; with publish=true it goes live as revision 3.
    restored = await client.post(
        f"{PAGES}/{page['id']}/revisions/1/restore",
        headers=h,
        json={"version": second["version"], "publish": True},
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["published_revision_number"] == 3
    assert await public_titles(client, "about") == ["Первая версия"]
    draft = await detail(client, h, page["id"])
    assert draft["sections"][0]["id"] == section["id"]  # same section, not a copy
    assert draft["has_unpublished_changes"] is False
    history = (await client.get(f"{PAGES}/{page['id']}/revisions", headers=h)).json()
    assert history[0]["comment"] == "Восстановлена версия №1"


async def test_restore_without_publishing_changes_only_the_draft(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    section = await add_section(client, h, page["id"], hero("A"))
    await publish_page(client, h, page["id"])
    await edit_title(client, h, section, "B")
    added = await add_section(client, h, page["id"], hero("C"))
    second = await publish_page(client, h, page["id"])

    res = await client.post(
        f"{PAGES}/{page['id']}/revisions/1/restore", headers=h, json={"version": second["version"]}
    )
    assert res.status_code == 200, res.text
    assert await public_titles(client, "about") == ["B", "C"]
    draft = await detail(client, h, page["id"])
    assert [s["data"]["title"]["ru"] for s in draft["sections"]] == ["A"]
    assert draft["has_unpublished_changes"] is True
    gone = await client.get(f"{SECTIONS}/{added['id']}", headers=h)
    assert gone.status_code == 404


async def test_nothing_to_publish_and_coming_back(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    await add_section(client, h, page["id"], hero("A"))
    published = await publish_page(client, h, page["id"])

    published_hash = (await detail(client, h, page["id"]))["draft_hash"]
    again = await client.post(
        f"{PAGES}/{page['id']}/publish",
        headers=h,
        json={"version": published["version"], "draft_hash": published_hash},
    )
    assert (again.status_code, again.json()["error"]["code"]) == (409, "NO_CHANGES")

    down = await client.post(
        f"{PAGES}/{page['id']}/unpublish", headers=h, json={"version": published["version"]}
    )
    assert down.json()["is_published"] is False
    assert await public_titles(client, "about") is None
    twice = await client.post(
        f"{PAGES}/{page['id']}/unpublish", headers=h, json={"version": down.json()["version"]}
    )
    assert twice.json()["error"]["code"] == "NOT_PUBLISHED"

    # Taken down and unchanged: publishing brings it back, without a duplicate revision.
    back = await publish_page(client, h, page["id"])
    assert (back["is_published"], back["published_revision_number"]) == (True, 1)
    assert await public_titles(client, "about") == ["A"]


async def test_publish_refuses_a_draft_changed_meanwhile(
    client: AsyncClient, editor: AdminUser, admin: AdminUser
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    section = await add_section(client, h, page["id"], hero("A"))
    seen = await detail(client, h, page["id"])
    # Someone else edits a block after the editor opened the page.
    await edit_title(client, auth_header(admin), section, "Чужая правка")

    res = await client.post(
        f"{PAGES}/{page['id']}/publish",
        headers=h,
        json={"version": seen["version"], "draft_hash": seen["draft_hash"]},
    )
    assert (res.status_code, res.json()["error"]["code"]) == (409, "DRAFT_CHANGED")
    stale = await client.post(
        f"{PAGES}/{page['id']}/publish",
        headers=h,
        json={"version": seen["version"] + 5, "draft_hash": seen["draft_hash"]},
    )
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"
    assert await public_titles(client, "about") is None


async def test_publish_lists_problems_of_every_block(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    good = await add_section(client, h, page["id"], hero("Норм"))
    bad = await add_section(client, h, page["id"], hero("Сломаю"))
    # Data broken outside the admin (an old import, a manual fix in the database).
    await session.execute(
        update(Section)
        .where(Section.id == uuid.UUID(bad["id"]))
        .values(
            data={
                "title": {"ru": "Сломаю"},
                "ctas": [{"label": {"ru": ""}, "href": "#contacts"}],
                "background_media_id": str(uuid.uuid4()),
            }
        )
    )
    await session.commit()

    detail_now = await detail(client, h, page["id"])
    res = await client.post(
        f"{PAGES}/{page['id']}/publish",
        headers=h,
        json={"version": detail_now["version"], "draft_hash": detail_now["draft_hash"]},
    )
    assert res.status_code == 422
    errors = res.json()["error"]["details"]
    assert {tuple(e["loc"]) for e in errors} == {
        ("sections", 1, "data", "ctas", 0, "label", "ru"),
        ("sections", 1, "data", "background_media_id"),
    }
    assert {e["section_id"] for e in errors} == {bad["id"]}
    assert good["id"] not in {e["section_id"] for e in errors}
    assert await public_titles(client, "about") is None


async def test_discard_draft(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    never = await client.post(f"{PAGES}/{page['id']}/discard-draft", headers=h, json={"version": 1})
    assert (never.status_code, never.json()["error"]["code"]) == (409, "NOT_PUBLISHED")

    kept = await add_section(client, h, page["id"], hero("Опубликовано"))
    published = await publish_page(client, h, page["id"])
    await edit_title(client, h, kept, "Черновик")
    extra = await add_section(client, h, page["id"], hero("Лишний"))
    meta = await client.patch(
        f"{PAGES}/{page['id']}", headers=h,
        json={"version": published["version"], "title": {"ru": "Новое название"}},
    )  # fmt: skip

    res = await client.post(
        f"{PAGES}/{page['id']}/discard-draft", headers=h, json={"version": meta.json()["version"]}
    )
    assert res.status_code == 200, res.text
    draft = await detail(client, h, page["id"])
    assert draft["title"] == {"ru": "О нас"}
    assert [(s["id"], s["data"]["title"]["ru"]) for s in draft["sections"]] == [
        (kept["id"], "Опубликовано")
    ]
    assert draft["has_unpublished_changes"] is False
    assert (await client.get(f"{SECTIONS}/{extra['id']}", headers=h)).status_code == 404


async def test_title_and_seo_go_live_on_publishing(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    published = await publish_page(client, h, page["id"])
    await client.patch(
        f"{PAGES}/{page['id']}",
        headers=h,
        json={
            "version": published["version"],
            "title": {"ru": "Компания"},
            "seo_description": {"ru": "Описание"},
        },
    )
    assert (await client.get(f"{PUBLIC}/about")).json()["title"] == "О нас"
    await publish_page(client, h, page["id"])
    body = (await client.get(f"{PUBLIC}/about")).json()
    assert (body["title"], body["seo"]["description"]) == ("Компания", "Описание")


async def test_reverting_an_edit_clears_the_changes_flag(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    section = await add_section(client, h, page["id"], hero("A"))
    await publish_page(client, h, page["id"])
    await edit_title(client, h, section, "B")
    assert (await detail(client, h, page["id"]))["has_unpublished_changes"] is True
    await edit_title(client, h, section, "A")
    assert (await detail(client, h, page["id"]))["has_unpublished_changes"] is False


# --- usage: published versions keep their files --------------------------------------


async def test_file_on_the_published_page_cannot_be_deleted(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    media = await ready_media(session, "facade.jpg")
    media_id = str(media.id)
    page = await make_page(client, h)
    section = await add_section(
        client, h, page["id"],
        {"type": "hero", "data": {"title": {"ru": "A"}, "background_media_id": media_id}},
    )  # fmt: skip
    published = await publish_page(client, h, page["id"])

    # Removed from the draft, but the site still shows it.
    current = (await client.get(f"{SECTIONS}/{section['id']}", headers=h)).json()
    await client.patch(
        f"{SECTIONS}/{section['id']}", headers=h,
        json={"version": current["version"], "data": {"title": {"ru": "A"}}},
    )  # fmt: skip
    res = await client.delete(f"/api/v1/admin/media/{media_id}", headers=h, params={"version": 1})
    assert res.json()["error"]["code"] == "IN_USE"
    places = res.json()["error"]["details"]
    assert [(u["entity_type"], u["field"]) for u in places] == [
        ("page_revision", f"sections.{section['id']}.data")
    ]
    assert "опубликованная версия" in places[0]["label"]

    # Taken down, the page still keeps it: publishing again must not show a broken image.
    await client.post(
        f"{PAGES}/{page['id']}/unpublish", headers=h, json={"version": published["version"]}
    )
    res = await client.delete(f"/api/v1/admin/media/{media_id}", headers=h, params={"version": 1})
    assert res.json()["error"]["code"] == "IN_USE"

    # Once a version without it is published, the file is free.
    await publish_page(client, h, page["id"])
    res = await client.delete(f"/api/v1/admin/media/{media_id}", headers=h, params={"version": 1})
    assert res.status_code == 204


async def test_restoring_a_version_with_a_deleted_file_is_refused(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    media = await ready_media(session, "old.jpg")
    media_id = str(media.id)
    page = await make_page(client, h)
    section = await add_section(
        client, h, page["id"],
        {"type": "hero", "data": {"title": {"ru": "A"}, "background_media_id": media_id}},
    )  # fmt: skip
    await publish_page(client, h, page["id"])
    await edit_title(client, h, section, "Без картинки")
    second = await publish_page(client, h, page["id"])
    # Older revisions do not hold files.
    assert (
        await client.delete(f"/api/v1/admin/media/{media_id}", headers=h, params={"version": 1})
    ).status_code == 204

    res = await client.post(
        f"{PAGES}/{page['id']}/revisions/1/restore", headers=h,
        json={"version": second["version"], "publish": True},
    )  # fmt: skip
    assert res.status_code == 422
    assert res.json()["error"]["details"][0]["loc"] == [
        "sections",
        0,
        "data",
        "background_media_id",
    ]
    # Nothing changed.
    assert await public_titles(client, "about") == ["Без картинки"]
    assert (await detail(client, h, page["id"]))["sections"][0]["data"]["title"][
        "ru"
    ] == "Без картинки"


# --- preview tokens -----------------------------------------------------------------


async def test_preview_tokens_open_one_page_only(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    about = await make_page(client, h, "about")
    await make_page(client, h, "team")
    token = create_preview_token(get_settings(), uuid.UUID(about["id"]))

    assert (
        await client.get("/api/v1/preview/pages/about", params={"token": token})
    ).status_code == 200
    other = await client.get("/api/v1/preview/pages/team", params={"token": token})
    assert (other.status_code, other.json()["error"]["code"]) == (404, "NOT_FOUND")

    access = create_access_token(get_settings(), editor.id, "editor")
    res = await client.get("/api/v1/preview/pages/about", params={"token": access})
    assert (res.status_code, res.json()["error"]["code"]) == (401, "UNAUTHORIZED")
    # And a preview token is not an admin token.
    res = await client.get(PAGES, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


# --- caching ------------------------------------------------------------------------


async def test_public_responses_revalidate_with_etag(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    section = await add_section(client, h, page["id"], hero("A"))
    await publish_page(client, h, page["id"])

    first = await client.get(f"{PUBLIC}/about")
    assert first.headers["cache-control"] == "public, max-age=0, must-revalidate"
    etag = first.headers["etag"]
    same = await client.get(f"{PUBLIC}/about", headers={"If-None-Match": etag})
    assert (same.status_code, same.content) == (304, b"")

    await edit_title(client, h, section, "B")
    await publish_page(client, h, page["id"])
    changed = await client.get(f"{PUBLIC}/about", headers={"If-None-Match": etag})
    assert changed.status_code == 200
    assert changed.headers["etag"] != etag

    # Other locales are other URLs with their own tags.
    assert (await client.get(f"{PUBLIC}/about", params={"locale": "en"})).headers["etag"]
    admin = await client.get(PAGES, headers=h)
    assert admin.headers["cache-control"] == "no-store"
    assert "etag" not in admin.headers


# --- page deletion and the log ------------------------------------------------------


async def test_deleting_a_published_page_removes_its_history(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    await add_section(client, h, page["id"], hero("A"))
    published = await publish_page(client, h, page["id"])
    res = await client.delete(
        f"{PAGES}/{page['id']}", headers=h, params={"version": published["version"]}
    )
    assert res.status_code == 204
    left = await session.scalars(
        select(PageRevision).where(PageRevision.page_id == uuid.UUID(page["id"]))
    )
    assert list(left) == []
    assert await session.get(Page, uuid.UUID(page["id"])) is None


async def test_publishing_is_logged(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    published = await publish_page(client, h, page["id"], "Запуск")
    await client.post(
        f"{PAGES}/{page['id']}/unpublish", headers=h, json={"version": published["version"]}
    )
    actions = [
        (row.action, row.changes)
        for row in await session.scalars(
            select(AuditLog)
            .where(AuditLog.entity_id == uuid.UUID(page["id"]))
            .order_by(AuditLog.created_at)
        )
    ]
    assert actions[-2:] == [
        ("publish", {"revision": 1, "comment": "Запуск"}),
        ("unpublish", None),
    ]


# --- seeds --------------------------------------------------------------------------


async def test_seeds_publish_revision_one(
    client: AsyncClient, session: AsyncSession, storage: InMemoryStorage
) -> None:
    """A clean database plus the seeds is a working site: every page served from revision 1."""
    from seed.content import seed_all
    from seed.seeder import Seeder

    await seed_all(Seeder(session, storage))
    await session.commit()
    home = await client.get(f"{PUBLIC}/home")
    assert home.status_code == 200
    assert len(home.json()["sections"]) == 9
    numbers = list(await session.scalars(select(PageRevision.number)))
    pages = list(await session.scalars(select(Page.slug)))
    assert numbers == [1] * len(pages)

    # Running the seeds again without changes adds no revisions.
    await seed_all(Seeder(session, storage))
    await session.commit()
    assert len(list(await session.scalars(select(PageRevision.id)))) == len(pages)
