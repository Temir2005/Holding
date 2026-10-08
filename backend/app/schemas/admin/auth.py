import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field

from app.models import UserRole
from app.schemas.admin.common import VersionedUpdate

MIN_PASSWORD_LENGTH = 10


def normalize_email(value: str) -> str:
    value = value.strip().lower()
    local, _, domain = value.partition("@")
    if not local or "." not in domain or " " in value:
        raise ValueError("Некорректный email")
    return value


Email = Annotated[str, Field(max_length=254), AfterValidator(normalize_email)]
Password = Annotated[str, Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)]


class LoginRequest(BaseModel):
    email: Email
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    version: int


class TokenResponse(BaseModel):
    """The refresh token is not here: it is set as an httpOnly cookie."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Access token lifetime, seconds")
    user: UserRead


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password


class UserCreate(BaseModel):
    email: Email
    full_name: str = Field(min_length=1, max_length=200)
    role: UserRole = UserRole.editor
    password: Password


class UserUpdate(VersionedUpdate):
    not_null = frozenset({"full_name", "role", "is_active"})

    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    role: UserRole | None = None
    is_active: bool | None = None


class SetPasswordRequest(BaseModel):
    new_password: Password
