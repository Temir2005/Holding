import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditActor(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str


class AuditRead(BaseModel):
    id: uuid.UUID
    action: str
    entity_type: str
    entity_id: uuid.UUID | None
    changes: dict[str, Any] | None
    # Null when the system acted (seed, CLI) or the user was removed.
    user: AuditActor | None
    created_at: datetime
