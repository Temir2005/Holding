import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import AuditDep, SessionDep, StorageDep
from app.schemas.admin.common import ListParams, Paginated, ReorderRequest, error_responses
from app.schemas.admin.pages import (
    PageAdminRead,
    PageCreate,
    PageDetail,
    PageUpdate,
    SectionAdminRead,
    SectionCreate,
    SectionOrder,
)
from app.services.admin.pages import PageAdminService
from app.services.admin.sections import SectionAdminService

router = APIRouter(prefix="/pages", tags=["admin: pages"])


def page_service(session: SessionDep, audit: AuditDep, storage: StorageDep) -> PageAdminService:
    return PageAdminService(session, audit, storage)


def section_service(
    session: SessionDep, audit: AuditDep, storage: StorageDep
) -> SectionAdminService:
    return SectionAdminService(session, audit, storage)


Pages = Annotated[PageAdminService, Depends(page_service)]
Sections = Annotated[SectionAdminService, Depends(section_service)]


@router.get("", response_model=Paginated[PageAdminRead], summary="List pages")
async def list_pages(
    svc: Pages, params: Annotated[ListParams, Depends()]
) -> Paginated[PageAdminRead]:
    return await svc.list(params)


@router.post(
    "",
    response_model=PageAdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a page",
    responses=error_responses(409, 422),
)
async def create_page(data: PageCreate, svc: Pages) -> PageAdminRead:
    return await svc.create(data)


@router.put(
    "/order",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reorder pages (all ids, in the new order)",
    responses=error_responses(409),
)
async def reorder_pages(data: ReorderRequest, svc: Pages) -> None:
    await svc.reorder(data.ids)


@router.get(
    "/{page_id}",
    response_model=PageDetail,
    summary="Page with its sections in stored form",
    responses=error_responses(404),
)
async def get_page(page_id: uuid.UUID, svc: Pages, sections: Sections) -> PageDetail:
    return await svc.detail(page_id, sections)


@router.patch(
    "/{page_id}",
    response_model=PageAdminRead,
    summary="Edit slug (at once), title, SEO, og-image (go live on publishing)",
    responses=error_responses(404, 409, 422),
)
async def update_page(page_id: uuid.UUID, data: PageUpdate, svc: Pages) -> PageAdminRead:
    return await svc.update(page_id, data)


@router.delete(
    "/{page_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a page with its sections; refused while menus or buttons link to it",
    responses=error_responses(404, 409),
)
async def delete_page(page_id: uuid.UUID, svc: Pages, version: Annotated[int, Query(ge=1)]) -> None:
    await svc.delete(page_id, version)


@router.post(
    "/{page_id}/sections",
    response_model=SectionAdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a section to the page",
    responses=error_responses(404, 409, 422),
)
async def create_section(
    page_id: uuid.UUID, data: SectionCreate, svc: Sections
) -> SectionAdminRead:
    return await svc.create_in(page_id, data)


@router.put(
    "/{page_id}/sections/order",
    response_model=list[SectionAdminRead],
    summary="Reorder the page's sections in one request",
    responses=error_responses(404, 409),
)
async def reorder_sections(
    page_id: uuid.UUID, data: SectionOrder, svc: Sections
) -> list[SectionAdminRead]:
    return await svc.reorder_page(page_id, data.ids)
