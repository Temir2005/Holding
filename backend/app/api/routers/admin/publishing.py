import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.api.deps import AuditDep, CurrentUser, SessionDep, SettingsDep, StorageDep
from app.schemas.admin.common import error_responses
from app.schemas.admin.pages import PageAdminRead
from app.schemas.admin.publishing import (
    PageAction,
    PreviewLink,
    PublishRequest,
    RestoreRequest,
    RevisionDetail,
    RevisionRead,
)
from app.services.admin.publishing import PublishingService

router = APIRouter(prefix="/pages/{page_id}", tags=["admin: publishing"])


def publishing_service(
    session: SessionDep,
    audit: AuditDep,
    storage: StorageDep,
    settings: SettingsDep,
    user: CurrentUser,
) -> PublishingService:
    return PublishingService(session, audit, storage, settings, acting_user=user)


Publishing = Annotated[PublishingService, Depends(publishing_service)]
Number = Annotated[int, Path(ge=1, description="Revision number")]


@router.post(
    "/publish",
    response_model=PageAdminRead,
    summary="Put the draft on the site as a new revision (or bring the page back)",
    responses=error_responses(404, 409, 422),
)
async def publish(page_id: uuid.UUID, data: PublishRequest, svc: Publishing) -> PageAdminRead:
    return await svc.publish(page_id, data)


@router.post(
    "/unpublish",
    response_model=PageAdminRead,
    summary="Take the page off the site (not the home page)",
    responses=error_responses(404, 409),
)
async def unpublish(page_id: uuid.UUID, data: PageAction, svc: Publishing) -> PageAdminRead:
    return await svc.unpublish(page_id, data)


@router.post(
    "/discard-draft",
    response_model=PageAdminRead,
    summary="Drop unpublished changes: the draft becomes what the site shows",
    responses=error_responses(404, 409, 422),
)
async def discard_draft(page_id: uuid.UUID, data: PageAction, svc: Publishing) -> PageAdminRead:
    return await svc.discard_draft(page_id, data)


@router.get(
    "/revisions",
    response_model=list[RevisionRead],
    summary="Published versions of the page, newest first",
    responses=error_responses(404),
)
async def list_revisions(page_id: uuid.UUID, svc: Publishing) -> list[RevisionRead]:
    return await svc.history(page_id)


@router.get(
    "/revisions/{number}",
    response_model=RevisionDetail,
    summary="One published version with its full content",
    responses=error_responses(404),
)
async def get_revision(page_id: uuid.UUID, number: Number, svc: Publishing) -> RevisionDetail:
    return await svc.revision(page_id, number)


@router.post(
    "/revisions/{number}/restore",
    response_model=PageAdminRead,
    summary="Make an old version the draft again; with publish=true, put it on the site",
    responses=error_responses(404, 409, 422),
)
async def restore_revision(
    page_id: uuid.UUID, number: Number, data: RestoreRequest, svc: Publishing
) -> PageAdminRead:
    return await svc.restore(page_id, number, data)


@router.post(
    "/preview-token",
    response_model=PreviewLink,
    summary="A short-lived link to the draft, rendered like the public page",
    responses=error_responses(404),
)
async def preview_token(page_id: uuid.UUID, svc: Publishing) -> PreviewLink:
    return await svc.preview_link(page_id)
