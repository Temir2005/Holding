import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_error_handlers
from app.api.router import api_router
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="MegaSmart API",
    version="0.1.0",
    # Stable operation ids keep generated frontend types readable.
    generate_unique_id_function=lambda route: route.name,
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
app.include_router(api_router)
