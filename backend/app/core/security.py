"""Passwords (argon2), access tokens (JWT) and opaque refresh tokens."""

import hashlib
import secrets
import time
import uuid
from dataclasses import dataclass
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import Settings
from app.core.errors import Unauthorized

ALGORITHM = "HS256"
ACCESS = "access"

_hasher = PasswordHasher()
# Verified when the email is unknown, so a miss takes as long as a wrong password.
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


@dataclass(frozen=True)
class AccessClaims:
    user_id: uuid.UUID
    role: str
    # Float seconds: compared with password_changed_at, so second precision is too coarse.
    issued_at: float


def create_token(
    settings: Settings, *, subject: str, kind: str, ttl_seconds: int, **extra: Any
) -> str:
    now = time.time()
    payload = {"sub": subject, "typ": kind, "iat": now, "exp": now + ttl_seconds, **extra}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(settings: Settings, token: str, *, kind: str) -> dict[str, Any]:
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.jwt_secret, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
        )
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("Срок действия токена истёк", code="TOKEN_EXPIRED") from exc
    except jwt.PyJWTError as exc:
        raise Unauthorized("Недействительный токен") from exc
    if payload.get("typ") != kind:
        raise Unauthorized("Недействительный токен")
    return payload


def create_access_token(settings: Settings, user_id: uuid.UUID, role: str) -> str:
    return create_token(
        settings,
        subject=str(user_id),
        kind=ACCESS,
        ttl_seconds=settings.access_token_ttl_minutes * 60,
        role=role,
    )


def decode_access_token(settings: Settings, token: str) -> AccessClaims:
    payload = decode_token(settings, token, kind=ACCESS)
    try:
        return AccessClaims(
            user_id=uuid.UUID(payload["sub"]),
            role=str(payload["role"]),
            issued_at=float(payload["iat"]),
        )
    except (KeyError, ValueError) as exc:
        raise Unauthorized("Недействительный токен") from exc


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def hash_ip(ip: str | None, salt: str) -> str | None:
    """Salted hash: lets us count requests per IP without storing the address."""
    return sha256(f"{salt}:{ip}") if ip else None
