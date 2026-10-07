import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import SessionDep
from app.schemas.admin.audit import AuditRead
from app.schemas.admin.common import ListParams, Paginated
from app.services.admin.audit import AuditService

router = APIRouter(prefix="/audit-log", tags=["admin: audit log"])


@router.get(
    "",
    response_model=Paginated[AuditRead],
    summary="Who changed what, newest first (search and sort are not used here)",
)
async def list_audit_log(
    session: SessionDep,
    params: Annotated[ListParams, Depends()],
    entity_type: Annotated[str | None, Query(max_length=64)] = None,
    entity_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    action: Annotated[str | None, Query(max_length=32)] = None,
    since: datetime | None = None,
    until: datetime | None = None,
) -> Paginated[AuditRead]:
    return await AuditService(session).list(
        params,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        since=since,
        until=until,
    )
