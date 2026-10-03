from fastapi import APIRouter

from app.api.routers.public import content, health, leads

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(content.router)
api_router.include_router(leads.router)
