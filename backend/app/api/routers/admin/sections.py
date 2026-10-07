import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.routers.admin.pages import Sections
from app.schemas.admin.common import error_responses
from app.schemas.admin.pages import SectionAdminRead, SectionUpdate

router = APIRouter(prefix="/sections", tags=["admin: pages"])


@router.get(
    "/{section_id}",
    response_model=SectionAdminRead,
    summary="Get a section in stored form with cards of referenced objects",
    responses=error_responses(404),
)
async def get_section(section_id: uuid.UUID, svc: Sections) -> SectionAdminRead:
    return await svc.read(section_id)


@router.patch(
    "/{section_id}",
    response_model=SectionAdminRead,
    summary="Edit data, anchor, tone or hide/show (is_visible)",
    responses=error_responses(404, 409, 422),
)
async def update_section(
    section_id: uuid.UUID, data: SectionUpdate, svc: Sections
) -> SectionAdminRead:
    return await svc.update(section_id, data)


@router.post(
    "/{section_id}/duplicate",
    response_model=SectionAdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Copy the section right after the original (without the anchor)",
    responses=error_responses(404),
)
async def duplicate_section(section_id: uuid.UUID, svc: Sections) -> SectionAdminRead:
    return await svc.duplicate(section_id)


@router.delete(
    "/{section_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a section",
    responses=error_responses(404, 409),
)
async def delete_section(
    section_id: uuid.UUID, svc: Sections, version: Annotated[int, Query(ge=1)]
) -> None:
    await svc.delete(section_id, version)
