"""Admin API, mounted at /api/v1/admin.

Access is enforced per router, not per endpoint:
- `auth`: open (login, refresh) or signed-in user (me, password);
- editor routers: content and media, `require_editor`;
- admin routers: users, audit log, site settings, `require_admin`.
"""

from fastapi import APIRouter, Depends

from app.api.deps import require_admin, require_editor
from app.api.routers.admin import audit, auth, collections, media, meta, pages, sections, users
from app.schemas.admin.common import error_responses

admin_router = APIRouter(prefix="/admin")
admin_router.include_router(auth.router)

editor_routes = APIRouter(
    dependencies=[Depends(require_editor)], responses=error_responses(401, 403)
)
editor_routes.include_router(media.router)
editor_routes.include_router(pages.router)
editor_routes.include_router(sections.router)
editor_routes.include_router(meta.router)
editor_routes.include_router(collections.router)
admin_routes = APIRouter(dependencies=[Depends(require_admin)], responses=error_responses(401, 403))
admin_routes.include_router(users.router)
admin_routes.include_router(audit.router)

admin_router.include_router(editor_routes)
admin_router.include_router(admin_routes)
