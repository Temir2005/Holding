"""Draft preview: the page as it would look after publishing, by a short-lived link.

The token (POST /admin/pages/{id}/preview-token) opens one page's draft without
signing in, so it can be sent to someone to review. Never cached.
"""

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import MapperDep, RepoDep, SettingsDep
from app.core.errors import NotFound
from app.core.security import decode_preview_token
from app.schemas.admin.common import error_responses
from app.schemas.pages import PageRead
from app.services.pages import PageService

router = APIRouter(prefix="/preview", tags=["preview"])


@router.get(
    "/pages/{slug}",
    response_model=PageRead,
    summary="The page's draft, in the same format as GET /pages/{slug}",
    responses=error_responses(401, 404),
)
async def preview_page(
    slug: str,
    token: Annotated[str, Query(min_length=1, max_length=2048)],
    repo: RepoDep,
    mapper: MapperDep,
    settings: SettingsDep,
) -> PageRead:
    page_id = decode_preview_token(settings, token)
    page = await PageService(repo, mapper).preview(page_id, mapper.locale)
    # The slug must match: a token for one page never opens another address.
    if page is None or page.slug != slug:
        raise NotFound("Страница не найдена", details={"slug": slug})
    return page
