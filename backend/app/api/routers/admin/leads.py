import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.deps import AuditDep, SessionDep, SettingsDep
from app.core.clock import utcnow
from app.schemas.admin.common import ListParams, Paginated, error_responses
from app.schemas.admin.leads import LeadAdminRead, LeadFilters, LeadUpdate
from app.services.admin.leads import LeadAdminService

router = APIRouter(prefix="/leads", tags=["admin: leads"])


def lead_service(session: SessionDep, audit: AuditDep, settings: SettingsDep) -> LeadAdminService:
    return LeadAdminService(session, audit, settings)


Leads = Annotated[LeadAdminService, Depends(lead_service)]
Params = Annotated[ListParams, Depends()]
Filters = Annotated[LeadFilters, Depends()]


@router.get("", response_model=Paginated[LeadAdminRead], summary="List leads, newest first")
async def list_leads(svc: Leads, params: Params, filters: Filters) -> Paginated[LeadAdminRead]:
    return await svc.search(params, filters)


@router.get(
    "/export",
    response_class=StreamingResponse,
    summary="Download leads matching the filters as CSV (for Excel)",
    responses={200: {"content": {"text/csv": {}}}},
)
async def export_leads(svc: Leads, params: Params, filters: Filters) -> StreamingResponse:
    lines = await svc.export_csv(params, filters)
    filename = f"leads-{utcnow():%Y-%m-%d}.csv"
    return StreamingResponse(
        lines,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{lead_id}", response_model=LeadAdminRead, summary="Get a lead", responses=error_responses(404)
)
async def get_lead(lead_id: uuid.UUID, svc: Leads) -> LeadAdminRead:
    return await svc.read(lead_id)


@router.patch(
    "/{lead_id}",
    response_model=LeadAdminRead,
    summary="Change the status or the manager note",
    responses=error_responses(404, 409, 422),
)
async def update_lead(lead_id: uuid.UUID, data: LeadUpdate, svc: Leads) -> LeadAdminRead:
    return await svc.update(lead_id, data)
