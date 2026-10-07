from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import SessionDep
from app.core.config import Settings, get_settings
from app.core.rate_limit import RateLimiter
from app.schemas.leads import LeadCreate, LeadCreated
from app.services.leads import LeadService

router = APIRouter(tags=["leads"])
_limiter = RateLimiter(get_settings().lead_rate_limit_per_minute)


@router.post("/leads", response_model=LeadCreated, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    request: Request,
    session: SessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> LeadCreated:
    if data.website:
        # Honeypot filled: pretend success so the bot does not retry.
        return LeadCreated(id=None)
    ip = request.client.host if request.client else None
    if not _limiter.allow(ip or "unknown"):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Слишком много заявок, попробуйте через минуту"
        )
    lead = await LeadService(session, settings).create(
        data, ip=ip, user_agent=request.headers.get("user-agent")
    )
    return LeadCreated(id=lead.id)
