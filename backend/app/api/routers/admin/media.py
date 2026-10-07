import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import AuditDep, CurrentUser, SessionDep, SettingsDep, StorageDep
from app.schemas.admin.common import ListParams, Paginated, error_responses
from app.schemas.admin.media import (
    CompletedUpload,
    FolderCount,
    MediaAdminRead,
    MediaUpdate,
    MediaUsage,
    UploadRequest,
    UploadTicket,
)
from app.services.admin.media import MediaService
from app.services.admin.media_files import MediaKind

router = APIRouter(prefix="/media", tags=["admin: media"])


def service(
    session: SessionDep,
    audit: AuditDep,
    storage: StorageDep,
    settings: SettingsDep,
    user: CurrentUser,
) -> MediaService:
    return MediaService(session, audit, storage, settings, acting_user=user)


Service = Annotated[MediaService, Depends(service)]


@router.get("", response_model=Paginated[MediaAdminRead], summary="Media library (ready files)")
async def list_media(
    svc: Service,
    params: Annotated[ListParams, Depends()],
    kind: MediaKind | None = None,
    folder: Annotated[str | None, Query(max_length=128)] = None,
) -> Paginated[MediaAdminRead]:
    return await svc.list_ready(params, kind=kind, folder=folder)


@router.get("/folders", response_model=list[FolderCount], summary="Folders with file counts")
async def list_folders(svc: Service) -> list[FolderCount]:
    return await svc.folders()


@router.post(
    "/upload-url",
    response_model=UploadTicket,
    status_code=status.HTTP_201_CREATED,
    summary="Step 1: check type and size, get a URL to PUT the file to",
    responses=error_responses(422),
)
async def request_upload(data: UploadRequest, svc: Service) -> UploadTicket:
    return await svc.request_upload(data)


@router.post(
    "/{media_id}/complete",
    response_model=CompletedUpload,
    summary="Step 3: confirm the upload; the server checks the real file",
    responses=error_responses(404, 409, 422),
)
async def complete_upload(media_id: uuid.UUID, svc: Service) -> CompletedUpload:
    return await svc.complete(media_id)


@router.get(
    "/{media_id}",
    response_model=MediaAdminRead,
    summary="Get a file",
    responses=error_responses(404),
)
async def get_media(media_id: uuid.UUID, svc: Service) -> MediaAdminRead:
    return await svc.read(media_id)


@router.patch(
    "/{media_id}",
    response_model=MediaAdminRead,
    summary="Edit alt text (all languages), folder, tags, display name",
    responses=error_responses(404, 409, 422),
)
async def update_media(media_id: uuid.UUID, data: MediaUpdate, svc: Service) -> MediaAdminRead:
    return await svc.update(media_id, data)


@router.get(
    "/{media_id}/usages",
    response_model=list[MediaUsage],
    summary="Where this file is used",
    responses=error_responses(404),
)
async def media_usages(media_id: uuid.UUID, svc: Service) -> list[MediaUsage]:
    return await svc.usages(media_id)


@router.delete(
    "/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a file and its stored objects; refused while it is used",
    responses=error_responses(404, 409),
)
async def delete_media(
    media_id: uuid.UUID, svc: Service, version: Annotated[int, Query(ge=1)]
) -> None:
    await svc.delete(media_id, version)
