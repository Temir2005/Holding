import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.api.deps import SessionDep, SettingsDep, StorageDep
from app.schemas.admin.meta import Meta, SectionTypeInfo
from app.schemas.admin.pages import RefCard
from app.services.admin.meta import build_meta, section_types
from app.services.admin.refs import RefService

router = APIRouter(tags=["admin: schema"])

LookupKind = Literal[
    "media", "project", "person", "client", "division", "timeline_event", "stat", "vacancy", "page"
]


@router.get("/meta", response_model=Meta, summary="Languages, enums, icons, limits")
async def get_meta(settings: SettingsDep) -> Meta:
    return build_meta(settings)


@router.get(
    "/section-types",
    response_model=list[SectionTypeInfo],
    response_model_by_alias=True,
    summary="Every section type with the JSON Schema of its stored data and UI hints",
)
async def get_section_types() -> list[SectionTypeInfo]:
    return section_types()


@router.get(
    "/lookup",
    response_model=list[RefCard],
    summary="Search entities for a reference picker (kind from x-ref, or page for links)",
)
async def lookup(
    session: SessionDep,
    storage: StorageDep,
    kind: LookupKind,
    q: Annotated[str | None, Query(max_length=200)] = None,
    ids: Annotated[list[uuid.UUID] | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[RefCard]:
    return await RefService(session, storage).lookup(kind, q=q, ids=ids or [], limit=limit)
