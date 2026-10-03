from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.api.deps import SessionDep, StorageDep

router = APIRouter(tags=["health"])


class Health(BaseModel):
    status: str
    database: bool
    storage: bool


@router.get("/health", response_model=Health)
async def health(session: SessionDep, storage: StorageDep) -> Health:
    try:
        await session.execute(text("select 1"))
        db_ok = True
    except Exception:
        db_ok = False
    s3_ok = await storage.ping()
    return Health(status="ok" if db_ok and s3_ok else "degraded", database=db_ok, storage=s3_ok)
