import io
import struct
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from PIL import Image
from PIL.JpegImagePlugin import JpegImageFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import AdminUser, Media, Page, Project, ProjectStatus, RefreshToken, Section
from app.services.admin.cleanup import run_cleanup
from app.storage.memory import InMemoryStorage
from tests.conftest import auth_header, publish

MEDIA = "/api/v1/admin/media"


def jpeg(
    width: int = 1200, height: int = 800, color: tuple[int, int, int] = (40, 90, 160)
) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, "JPEG", quality=90)
    return buf.getvalue()


def png(width: int = 64, height: int = 64) -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", (width, height), (255, 0, 0, 128)).save(buf, "PNG")
    return buf.getvalue()


def box(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I4s", 8 + len(payload), kind) + payload


def mp4(width: int = 1920, height: int = 1080, padding: int = 0) -> bytes:
    tkhd = bytes(4) + bytes(20) + bytes(8) + bytes(8) + bytes(36)
    tkhd += struct.pack(">II", width << 16, height << 16)
    head = box(b"ftyp", b"isom" + bytes(4) + b"isomiso2") + box(
        b"moov", box(b"trak", box(b"tkhd", tkhd))
    )
    return head + box(b"mdat", bytes(padding))


async def upload(
    client: AsyncClient,
    storage: InMemoryStorage,
    headers: dict[str, str],
    body: bytes,
    content_type: str,
    filename: str = "file",
) -> dict[str, Any]:
    """Steps 1–2 of the flow: ask for a URL, then put the bytes where S3 would get them."""
    res = await client.post(
        f"{MEDIA}/upload-url",
        headers=headers,
        json={"filename": filename, "content_type": content_type, "size_bytes": len(body)},
    )
    assert res.status_code == 201, res.text
    ticket = res.json()
    key = ticket["media"]["url"].split(f"/{storage.bucket}/", 1)[1]
    await storage.upload(key, body, content_type)
    return dict(ticket)


async def test_upload_url_checks_type_and_size(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    zip_ = await client.post(
        f"{MEDIA}/upload-url",
        headers=h,
        json={"filename": "a.zip", "content_type": "application/zip", "size_bytes": 10},
    )
    assert zip_.json()["error"]["code"] == "MEDIA_TYPE_NOT_ALLOWED"
    big = await client.post(
        f"{MEDIA}/upload-url",
        headers=h,
        json={"filename": "a.jpg", "content_type": "image/jpeg", "size_bytes": 21 * 1024 * 1024},
    )
    assert big.json()["error"]["code"] == "MEDIA_TOO_LARGE"

    ok = await client.post(
        f"{MEDIA}/upload-url",
        headers=h,
        json={"filename": "Фасад.jpg", "content_type": "image/jpeg", "size_bytes": 1000},
    )
    ticket = ok.json()
    assert ticket["upload"]["method"] == "PUT"
    assert ticket["upload"]["headers"] == {"Content-Type": "image/jpeg"}
    assert ticket["media"]["status"] == "pending"
    assert ticket["media"]["original_filename"] == "Фасад.jpg"
    assert "Фасад" not in ticket["media"]["url"]  # random key, not the file name
    # Pending uploads are not in the library.
    assert (await client.get(MEDIA, headers=h)).json()["total"] == 0


async def test_complete_requires_the_object(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    res = await client.post(
        f"{MEDIA}/upload-url",
        headers=h,
        json={"filename": "a.jpg", "content_type": "image/jpeg", "size_bytes": 1000},
    )
    media_id = res.json()["media"]["id"]
    missing = await client.post(f"{MEDIA}/{media_id}/complete", headers=h)
    assert (missing.status_code, missing.json()["error"]["code"]) == (409, "UPLOAD_MISSING")


async def test_image_upload_reads_real_facts_and_makes_variants(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    ticket = await upload(client, storage, h, jpeg(1200, 800), "image/jpeg", "facade.jpg")
    media_id = ticket["media"]["id"]

    res = await client.post(f"{MEDIA}/{media_id}/complete", headers=h)
    assert res.status_code == 200, res.text
    media = res.json()["media"]
    assert (media["status"], media["width"], media["height"]) == ("ready", 1200, 800)
    assert media["dominant_color"].startswith("#")
    assert [(v["width"], v["height"]) for v in media["variants"]] == [(480, 320), (960, 640)]
    # Original + two WebP variants are in storage.
    assert len(storage.objects) == 3
    assert all(ct == "image/webp" for k, (_, ct) in storage.objects.items() if "_w" in k)

    listed = (await client.get(MEDIA, headers=h, params={"q": "facade"})).json()
    assert [m["id"] for m in listed["items"]] == [media_id]
    again = await client.post(f"{MEDIA}/{media_id}/complete", headers=h)
    assert again.json()["error"]["code"] == "UPLOAD_ALREADY_COMPLETED"


@pytest.mark.parametrize(
    ("declared", "body"),
    [
        ("image/png", b"%PDF-1.7 not an image"),
        ("image/jpeg", png()),
        ("application/pdf", jpeg(10, 10)),
    ],
)
async def test_type_spoofing_is_rejected_and_cleaned_up(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage, declared: str, body: bytes
) -> None:
    h = auth_header(editor)
    ticket = await upload(client, storage, h, body, declared)
    media_id = ticket["media"]["id"]
    res = await client.post(f"{MEDIA}/{media_id}/complete", headers=h)
    assert (res.status_code, res.json()["error"]["code"]) == (422, "MEDIA_TYPE_MISMATCH")
    assert storage.objects == {}
    assert (await client.get(f"{MEDIA}/{media_id}", headers=h)).status_code == 404


async def test_real_size_is_checked_on_complete(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    res = await client.post(
        f"{MEDIA}/upload-url",
        headers=h,
        json={"filename": "a.pdf", "content_type": "application/pdf", "size_bytes": 100},
    )
    ticket = res.json()
    key = ticket["media"]["url"].split(f"/{storage.bucket}/", 1)[1]
    await storage.upload(key, b"%PDF-1.7" + bytes(21 * 1024 * 1024), "application/pdf")
    done = await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    assert done.json()["error"]["code"] == "MEDIA_TOO_LARGE"
    assert storage.objects == {}


async def test_svg_is_cleaned(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    svg = (
        b'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        b'viewBox="0 0 280 64" onload="alert(1)">'
        b"<script>alert(2)</script>"
        b'<a xlink:href="javascript:alert(3)"><rect width="10" height="10"/></a>'
        b'<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>'
        b'<circle cx="5" cy="5" r="4" fill="#C77B4E"/></svg>'
    )
    ticket = await upload(client, storage, h, svg, "image/svg+xml")
    res = await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    body = res.json()
    assert (body["media"]["width"], body["media"]["height"]) == (280, 64)
    assert body["warnings"] and "SVG" in body["warnings"][0]
    stored = next(iter(storage.objects.values()))[0].decode()
    for bad in ("script", "onload", "javascript", "foreignObject", "<a "):
        assert bad not in stored
    assert "<circle" in stored


async def test_svg_entity_bomb_is_rejected(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    bomb = (
        b'<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol">'
        b'<!ENTITY lol2 "&lol;&lol;&lol;&lol;">]><svg xmlns="http://www.w3.org/2000/svg">&lol2;</svg>'
    )
    ticket = await upload(client, storage, h, bomb, "image/svg+xml")
    res = await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    assert res.json()["error"]["code"] == "MEDIA_TYPE_MISMATCH"


async def test_video_size_read_from_first_megabyte_only(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    ticket = await upload(client, storage, h, mp4(1920, 1080, padding=5 * 1024 * 1024), "video/mp4")
    storage.bytes_read = 0
    res = await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    media = res.json()["media"]
    assert (media["width"], media["height"], media["variants"]) == (1920, 1080, [])
    assert storage.bytes_read <= 1024 * 1024


async def test_pdf_is_accepted_without_dimensions(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    ticket = await upload(client, storage, h, b"%PDF-1.7\n" + bytes(2000), "application/pdf")
    res = await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    assert (res.json()["media"]["width"], res.json()["media"]["height"]) == (0, 0)


async def ready_jpeg(
    client: AsyncClient, storage: InMemoryStorage, h: dict[str, str]
) -> dict[str, Any]:
    ticket = await upload(client, storage, h, jpeg(), "image/jpeg")
    res = await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    return dict(res.json()["media"])


async def test_edit_alt_on_all_languages(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    media = await ready_jpeg(client, storage, h)
    res = await client.patch(
        f"{MEDIA}/{media['id']}",
        headers=h,
        json={
            "version": media["version"],
            "alt": {"ru": "Фасад", "kk": "Қасбет", "en": "Facade"},
            "tags": [" фасад ", "проект", "фасад"],
            "folder": "Проекты",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["alt"] == {"ru": "Фасад", "kk": "Қасбет", "en": "Facade"}
    assert body["tags"] == ["проект", "фасад"]
    folders = (await client.get(f"{MEDIA}/folders", headers=h)).json()
    assert folders == [{"folder": "Проекты", "count": 1}]
    stale = await client.patch(
        f"{MEDIA}/{media['id']}", headers=h, json={"version": 1, "folder": "X"}
    )
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"


async def test_used_file_cannot_be_deleted(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage, session: AsyncSession
) -> None:
    h = auth_header(editor)
    media = await ready_jpeg(client, storage, h)
    media_id = media["id"]
    session.add(
        Project(
            slug="p",
            title={"ru": "Проект"},
            status=ProjectStatus.planned,
            cover_id=media_id,
            tags=[],
        )
    )
    page = Page(slug="home", title={"ru": "Главная"})
    page.sections = [Section(type="hero", data={"background_media_id": str(media_id)})]
    session.add(page)
    await session.commit()

    usages = (await client.get(f"{MEDIA}/{media_id}/usages", headers=h)).json()
    assert {(u["entity_type"], u["field"]) for u in usages} == {
        ("project", "cover_id"),
        ("section", "data"),
    }

    res = await client.delete(
        f"{MEDIA}/{media_id}", headers=h, params={"version": media["version"]}
    )
    assert (res.status_code, res.json()["error"]["code"]) == (409, "IN_USE")
    assert len(res.json()["error"]["details"]) == 2
    assert len(storage.objects) == 3


async def test_unused_file_is_deleted_with_variants(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    media = await ready_jpeg(client, storage, h)
    res = await client.delete(
        f"{MEDIA}/{media['id']}", headers=h, params={"version": media["version"]}
    )
    assert res.status_code == 204
    assert storage.objects == {}


async def test_media_routes_need_a_token(client: AsyncClient) -> None:
    assert (await client.get(MEDIA)).status_code == 401


async def test_public_page_exposes_variants(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage, session: AsyncSession
) -> None:
    media = await ready_jpeg(client, storage, auth_header(editor))
    page = Page(slug="home", title={"ru": "Главная"})
    page.sections = [Section(type="hero", data={"background_media_id": str(media["id"])})]
    session.add(page)
    await session.commit()
    await publish(session, page)
    hero = (await client.get("/api/v1/pages/home")).json()["sections"][0]["data"]
    assert [v["width"] for v in hero["background"]["variants"]] == [480, 960]


async def test_cleanup_removes_stale_uploads_and_old_tokens(
    session: AsyncSession, storage: InMemoryStorage, editor: AdminUser
) -> None:
    now = datetime.now(UTC)
    stale = Media(
        s3_key="media/2026/01/stale.jpg",
        bucket="test",
        mime_type="image/jpeg",
        size_bytes=1,
        width=0,
        height=0,
        status="pending",
    )
    fresh = Media(
        s3_key="media/2026/01/fresh.jpg",
        bucket="test",
        mime_type="image/jpeg",
        size_bytes=1,
        width=0,
        height=0,
        status="pending",
    )
    session.add_all([stale, fresh])
    await session.commit()
    await session.execute(
        update(Media).where(Media.id == stale.id).values(created_at=now - timedelta(hours=25))
    )
    await storage.upload(stale.s3_key, b"x", "image/jpeg")

    def token(name: str, *, expires: timedelta, revoked: timedelta | None) -> RefreshToken:
        return RefreshToken(
            user_id=editor.id,
            token_hash=name.ljust(64, "0"),
            family_id=editor.id,
            expires_at=now + expires,
            revoked_at=(now - revoked) if revoked else None,
            created_at=now,
        )

    session.add_all(
        [
            token("expired", expires=timedelta(days=-1), revoked=None),
            token("revoked-long-ago", expires=timedelta(days=20), revoked=timedelta(days=8)),
            token("revoked-recently", expires=timedelta(days=20), revoked=timedelta(days=1)),
            token("active", expires=timedelta(days=20), revoked=None),
        ]
    )
    await session.commit()

    report = await run_cleanup(session, storage, get_settings())
    assert (report.stale_uploads, report.refresh_tokens) == (1, 2)
    remaining = set(await session.scalars(select(Media.s3_key)))
    assert remaining == {fresh.s3_key}
    assert storage.objects == {}
    kept = {h.rstrip("0") for h in await session.scalars(select(RefreshToken.token_hash))}
    assert kept == {"revoked-recently", "active"}


def jpeg_with_exif(width: int, height: int, orientation: int) -> bytes:
    """A camera-like JPEG: rotation tag, camera model and GPS position in EXIF."""
    image = Image.new("RGB", (width, height), (120, 60, 30))
    exif = Image.Exif()
    exif[0x0112] = orientation  # Orientation
    exif[0x0110] = "Secret Camera 3000"  # Model
    exif[0x8825] = {1: "N", 2: (43.0, 17.0, 0.0)}  # GPS IFD
    buf = io.BytesIO()
    image.save(buf, "JPEG", exif=exif, quality=90)
    return buf.getvalue()


async def test_photo_metadata_is_stripped_and_rotation_applied(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    h = auth_header(editor)
    original = jpeg_with_exif(1000, 600, orientation=6)  # "rotate 90° when showing"
    assert Image.open(io.BytesIO(original)).getexif()

    ticket = await upload(client, storage, h, original, "image/jpeg")
    res = await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    media = res.json()["media"]
    # Stored upright: width and height swapped by the rotation.
    assert (media["width"], media["height"]) == (600, 1000)

    key = ticket["media"]["url"].split(f"/{storage.bucket}/", 1)[1]
    stored = Image.open(io.BytesIO(storage.objects[key][0]))
    assert stored.size == (600, 1000)
    assert not stored.getexif(), "EXIF must be gone (camera, GPS, orientation)"
    assert b"Secret Camera" not in storage.objects[key][0]
    assert media["size_bytes"] == len(storage.objects[key][0])


async def test_png_text_chunks_are_stripped(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    from PIL.PngImagePlugin import PngInfo

    info = PngInfo()
    info.add_text("Author", "Иван с флешки")
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (0, 128, 0)).save(buf, "PNG", pnginfo=info)
    h = auth_header(editor)
    ticket = await upload(client, storage, h, buf.getvalue(), "image/png")
    await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)
    key = ticket["media"]["url"].split(f"/{storage.bucket}/", 1)[1]
    assert "Author" not in Image.open(io.BytesIO(storage.objects[key][0])).info


async def test_processing_runs_off_the_event_loop_and_without_row_lock(
    client: AsyncClient,
    editor: AdminUser,
    storage: InMemoryStorage,
    engine: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """While a big photo is processed, other requests are served and the row is free."""
    import asyncio
    import threading

    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.services.admin import media_files

    started, release = threading.Event(), threading.Event()
    real = media_files.process_raster

    def slow_process(*args: Any, **kwargs: Any) -> Any:
        started.set()
        release.wait(timeout=5)
        return real(*args, **kwargs)

    monkeypatch.setattr(media_files, "process_raster", slow_process)
    h = auth_header(editor)
    ticket = await upload(client, storage, h, jpeg(), "image/jpeg")
    media_id = ticket["media"]["id"]

    completing = asyncio.create_task(client.post(f"{MEDIA}/{media_id}/complete", headers=h))
    await asyncio.to_thread(started.wait, 5)

    # The event loop is free: another request is answered meanwhile.
    me = await client.get("/api/v1/admin/auth/me", headers=h)
    assert me.status_code == 200
    # The row is not locked: NOWAIT would fail at once if it were.
    async with async_sessionmaker(engine)() as other:
        await other.execute(
            text("SELECT id FROM media WHERE id = :id FOR UPDATE NOWAIT"), {"id": media_id}
        )
        await other.rollback()

    release.set()
    res = await completing
    assert res.status_code == 200, res.text
    assert res.json()["media"]["status"] == "ready"


async def test_upright_jpeg_keeps_its_quality(
    client: AsyncClient, editor: AdminUser, storage: InMemoryStorage
) -> None:
    """Stripping metadata must not re-compress the photo (found in a live upload: 25 → 12 KB)."""
    h = auth_header(editor)
    original = jpeg_with_exif(1000, 600, orientation=1)
    ticket = await upload(client, storage, h, original, "image/jpeg")
    await client.post(f"{MEDIA}/{ticket['media']['id']}/complete", headers=h)

    key = ticket["media"]["url"].split(f"/{storage.bucket}/", 1)[1]
    stored = Image.open(io.BytesIO(storage.objects[key][0]))
    source = Image.open(io.BytesIO(original))
    assert isinstance(stored, JpegImageFile) and isinstance(source, JpegImageFile)
    assert stored.quantization == source.quantization  # same quality, no generational loss
    assert not stored.getexif()
    assert b"Secret Camera" not in storage.objects[key][0]
