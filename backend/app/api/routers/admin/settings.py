from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import AuditDep, SessionDep, StorageDep
from app.schemas.admin.common import error_responses
from app.schemas.admin.settings import SettingsAdminRead, SettingsUpdate
from app.services.admin.settings import SettingsService

router = APIRouter(prefix="/settings", tags=["admin: settings"])


def settings_service(session: SessionDep, audit: AuditDep, storage: StorageDep) -> SettingsService:
    return SettingsService(session, audit, storage)


Settings = Annotated[SettingsService, Depends(settings_service)]


@router.get(
    "",
    response_model=SettingsAdminRead,
    summary="Site settings as stored, with cards of referenced files",
    responses=error_responses(404),
)
async def get_settings(svc: Settings) -> SettingsAdminRead:
    return await svc.current()


@router.put(
    "",
    response_model=SettingsAdminRead,
    summary="Replace the site settings (the whole document, with the version read)",
    responses=error_responses(404, 409, 422),
)
async def put_settings(data: SettingsUpdate, svc: Settings) -> SettingsAdminRead:
    return await svc.replace(data)
