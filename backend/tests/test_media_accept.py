"""Media fields take only fitting files (x-ref accept), checked when saving and publishing.

Data saved earlier is not re-checked on reading: the site keeps working.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Media, Section, SiteSettings
from tests.conftest import auth_header
from tests.test_pages_admin import (
    PAGES,
    SECTIONS,
    add_section,
    make_page,
    publish_page,
    ready_media,
)
from tests.test_settings_admin import SETTINGS, editable, site  # noqa: F401  (fixture)


async def media_of(session: AsyncSession, mime: str, name: str) -> str:
    """A ready file of this type; its id as a string (rows expire after a failed request)."""
    media = await ready_media(session, name)
    media.mime_type = mime
    await session.commit()
    return str(media.id)


def details(res: Any) -> list[dict[str, Any]]:
    assert res.status_code == 422, res.text
    return list(res.json()["error"]["details"])


async def test_block_refuses_a_video_in_a_photo_field(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    video = await media_of(session, "video/mp4", "clip.mp4")
    photo = await media_of(session, "image/jpeg", "photo.jpg")

    res = await client.post(
        f"{PAGES}/{page['id']}/sections",
        headers=h,
        json={
            "type": "video",
            "data": {"video_media_id": video, "poster_media_id": video},
        },
    )
    assert details(res) == [
        {
            "loc": ["body", "data", "poster_media_id"],
            "msg": "сюда подходит: фото; выбран файл: видео",
        }
    ]

    ok = await add_section(
        client,
        h,
        page["id"],
        {
            "type": "video",
            "data": {"video_media_id": video, "poster_media_id": photo},
        },
    )
    swapped = await client.patch(
        f"{SECTIONS}/{ok['id']}",
        headers=h,
        json={"version": ok["version"], "data": {**ok["data"], "video_media_id": photo}},
    )
    assert details(swapped)[0]["msg"] == "сюда подходит: видео; выбран файл: фото"


async def test_pictures_accept_svg_but_photos_do_not(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    svg = await media_of(session, "image/svg+xml", "logo.svg")
    await add_section(
        client,
        h,
        page["id"],
        {"type": "about_text", "data": {"body": {"ru": "Текст"}, "media_id": svg}},
    )
    res = await client.patch(
        f"{PAGES}/{page['id']}",
        headers=h,
        json={"version": page["version"], "og_image_id": svg},
    )
    assert details(res) == [
        {"loc": ["body", "og_image_id"], "msg": "сюда подходит: фото; выбран файл: SVG"}
    ]


async def test_settings_refuse_a_wrong_logo(
    client: AsyncClient,
    admin: AdminUser,
    session: AsyncSession,
    site: SiteSettings,  # noqa: F811
) -> None:
    h = auth_header(admin)
    pdf = await media_of(session, "application/pdf", "price.pdf")
    body = await editable(client, h)
    body["logo_id"] = pdf
    res = await client.put(SETTINGS, headers=h, json=body)
    assert details(res) == [
        {"loc": ["body", "logo_id"], "msg": "сюда подходит: фото, SVG; выбран файл: документ"}
    ]


async def test_publishing_checks_kinds_but_the_site_keeps_old_data(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    photo = await media_of(session, "image/jpeg", "photo.jpg")
    section = await add_section(
        client,
        h,
        page["id"],
        {"type": "quote", "data": {"text": {"ru": "Цитата"}, "media_id": photo}},
    )
    await publish_page(client, h, page["id"])

    # The file turns out to be a video (data from before the rule): the published page
    # still renders, but a new publication is refused with the path to the field.
    media = await session.get(Media, uuid.UUID(photo))
    assert media is not None
    media.mime_type = "video/mp4"
    row = await session.get(Section, section["id"])
    assert row is not None
    row.data = {**row.data, "text": {"ru": "Новая цитата"}}
    await session.commit()

    public = await client.get("/api/v1/pages/about", params={"locale": "ru"})
    assert public.status_code == 200
    assert public.json()["sections"][0]["data"]["text"] == "Цитата"

    detail = (await client.get(f"{PAGES}/{page['id']}", headers=h)).json()
    res = await client.post(
        f"{PAGES}/{page['id']}/publish",
        headers=h,
        json={"version": detail["version"], "draft_hash": detail["draft_hash"]},
    )
    assert details(res) == [
        {
            "loc": ["sections", 0, "data", "media_id"],
            "msg": "сюда подходит: фото; выбран файл: видео",
            "section_id": section["id"],
        }
    ]


async def test_usages_say_which_page_holds_the_block(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    photo = await media_of(session, "image/jpeg", "photo.jpg")
    await add_section(
        client,
        h,
        page["id"],
        {"type": "quote", "data": {"text": {"ru": "Цитата"}, "media_id": photo}},
    )
    await publish_page(client, h, page["id"])
    usages = (await client.get(f"/api/v1/admin/media/{photo}/usages", headers=h)).json()
    assert {u["entity_type"] for u in usages} == {"section", "page_revision"}
    assert all(u["page_id"] == page["id"] for u in usages)
