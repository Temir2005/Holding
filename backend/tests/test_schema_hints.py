"""Form hints for the admin UI: media `accept`, media lists in meta, entity form schemas."""

from typing import Any, get_args

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Media, MediaStatus
from app.schemas.admin.media import MediaForm, MediaUpdate
from app.schemas.admin.pages import PageForm, PageUpdate, SectionForm, SectionUpdate
from app.schemas.refs import MediaAccept
from app.schemas.sections import SECTION_SCHEMAS, SectionType
from app.schemas.site import SiteSettingsDoc
from app.services.admin.media_files import MediaKind
from tests.conftest import auth_header

ADMIN = "/api/v1/admin"


def media_refs(schema: dict[str, Any]) -> list[dict[str, Any]]:
    """Every `x-ref` of kind media in a JSON Schema, wherever it is nested."""
    found: list[dict[str, Any]] = []

    def visit(node: Any) -> None:
        if isinstance(node, dict):
            ref = node.get("x-ref")
            if isinstance(ref, dict) and ref.get("kind") == "media":
                found.append(ref)
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(schema)
    return found


def test_accept_values_are_the_media_kinds() -> None:
    assert set(get_args(MediaAccept)) == {k.value for k in MediaKind}


def test_every_media_field_says_which_files_fit() -> None:
    schemas = [s.stored.model_json_schema() for s in SECTION_SCHEMAS.values()]
    schemas.append(SiteSettingsDoc.model_json_schema())
    refs = [ref for schema in schemas for ref in media_refs(schema)]
    assert refs
    kinds = {k.value for k in MediaKind}
    for ref in refs:
        assert ref["accept"], ref
        assert set(ref["accept"]) <= kinds, ref

    video = SECTION_SCHEMAS[SectionType.video].stored.model_json_schema()["properties"]
    assert video["video_media_id"]["x-ref"]["accept"] == ["video"]
    assert video["poster_media_id"]["x-ref"]["accept"] == ["image"]
    site = SiteSettingsDoc.model_json_schema()["properties"]
    assert site["logo_id"]["x-ref"]["accept"] == ["image", "svg"]


def test_entity_forms_match_what_patch_accepts() -> None:
    assert set(MediaForm.model_fields) == set(MediaUpdate.model_fields) - {"version"}
    assert set(PageForm.model_fields) == set(PageUpdate.model_fields) - {"version"}
    assert set(SectionForm.model_fields) == set(SectionUpdate.model_fields) - {"version", "data"}


async def test_meta_lists_media_kinds_and_folders(
    client: AsyncClient, session: AsyncSession, editor: AdminUser
) -> None:
    for folder, status in (("projects", MediaStatus.ready), ("drafts", MediaStatus.pending)):
        session.add(
            Media(
                s3_key=f"media/2026/10/{folder}.jpg",
                bucket="test",
                mime_type="image/jpeg",
                size_bytes=1,
                width=1,
                height=1,
                folder=folder,
                status=status,
            )
        )
    await session.commit()

    meta = (await client.get(f"{ADMIN}/meta", headers=auth_header(editor))).json()
    assert [o["value"] for o in meta["media_kinds"]] == ["image", "svg", "video", "document"]
    assert meta["media_kinds"][0]["label"] == "Изображения"
    # Unfinished uploads are not in the library, so their folders are not offered.
    assert meta["media_folders"] == [{"value": "projects", "label": "projects"}]


async def test_entity_types_describe_the_media_form(client: AsyncClient, editor: AdminUser) -> None:
    res = await client.get(f"{ADMIN}/entity-types", headers=auth_header(editor))
    assert res.status_code == 200
    media = {t["type"]: t for t in res.json()}["media"]
    assert media["label"] == "Файл медиатеки"
    props = media["schema"]["properties"]
    assert props["alt"]["x-widget"] == "localized-text"
    assert (props["folder"]["x-widget"], props["folder"]["x-options"]) == (
        "combobox",
        "media_folders",
    )
    assert props["tags"]["x-widget"] == "tags"
    assert all(p.get("title") for p in props.values())


async def test_entity_types_need_a_token(client: AsyncClient) -> None:
    assert (await client.get(f"{ADMIN}/entity-types")).status_code == 401


async def test_entity_types_describe_page_and_block_settings(
    client: AsyncClient, editor: AdminUser
) -> None:
    types = {
        t["type"]: t
        for t in (await client.get(f"{ADMIN}/entity-types", headers=auth_header(editor))).json()
    }
    page = types["page"]["schema"]["properties"]
    assert page["og_image_id"]["x-ref"] == {"kind": "media", "many": False, "accept": ["image"]}
    assert page["seo_description"]["x-widget"] == "localized-textarea"
    block = types["section"]["schema"]["properties"]
    assert block["anchor"]["x-widget"] == "anchor"
    assert block["tone"]["x-enum-labels"] == {
        "dark": "Тёмный",
        "light": "Светлый",
        "accent": "Акцентный",
    }


async def test_lookup_cards_carry_slugs(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    from app.models import Division, Project, ProjectStatus

    division = Division(slug="dev", name={"ru": "Девелопмент"}, stats=[])
    session.add(division)
    await session.flush()
    session.add(
        Project(slug="alatau", title={"ru": "Alatau"}, status=ProjectStatus.planned, tags=[])
    )
    await session.commit()
    h = auth_header(editor)
    projects = (await client.get(f"{ADMIN}/lookup", headers=h, params={"kind": "project"})).json()
    divisions = (await client.get(f"{ADMIN}/lookup", headers=h, params={"kind": "division"})).json()
    assert [p["slug"] for p in projects] == ["alatau"]
    assert [d["slug"] for d in divisions] == ["dev"]
