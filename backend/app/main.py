import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from app.api.cache import register_cache_headers
from app.api.errors import register_error_handlers
from app.api.router import api_router
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO)

settings = get_settings()


def operation_id(route: APIRoute) -> str:
    """Unique, stable operation ids: the names of generated client types.

    Public and preview operations keep their function name: the site's generated
    types (frontend/src/api/schema.d.ts) refer to them. Admin operations get the
    area from their first tag, so the shared CRUD handlers of the collections stay
    distinct: "admin: projects" + list_items → admin_projects_list_items.
    """
    if not route.path.startswith("/api/v1/admin"):
        return route.name
    tag = str(route.tags[0]) if route.tags else "admin"
    area = tag.removeprefix("admin:").strip().replace(" ", "_").replace("-", "_")
    return f"admin_{area}_{route.name}"


app = FastAPI(
    title="MegaSmart API",
    version="0.1.0",
    # Stable operation ids keep generated frontend types readable.
    generate_unique_id_function=operation_id,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    # The admin's refresh token travels as a cookie.
    allow_credentials=True,
)
register_error_handlers(app)
register_cache_headers(app)
app.include_router(api_router)
