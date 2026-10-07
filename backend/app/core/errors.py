"""Domain errors.

Services raise these instead of HTTPException; app.api.errors turns them into
HTTP responses in one place. Each error has a stable machine-readable `code`
that the admin UI can switch on, a human `message`, and optional `details`.
"""

from typing import Any


class AppError(Exception):
    status_code = 400
    code = "BAD_REQUEST"

    def __init__(self, message: str, *, details: Any = None, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
        if code is not None:
            self.code = code


class NotFound(AppError):
    status_code = 404
    code = "NOT_FOUND"


class Unauthorized(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class Forbidden(AppError):
    status_code = 403
    code = "FORBIDDEN"


class Conflict(AppError):
    status_code = 409
    code = "CONFLICT"


class VersionConflict(Conflict):
    """The record changed since the client read it (optimistic locking)."""

    code = "VERSION_CONFLICT"

    def __init__(self, *, expected: int, actual: int) -> None:
        super().__init__(
            "Запись изменилась с момента загрузки. Обновите данные и повторите.",
            details={"expected_version": expected, "current_version": actual},
        )


class AlreadyExists(Conflict):
    code = "ALREADY_EXISTS"


class InUse(Conflict):
    """The record is referenced elsewhere; `details` lists where."""

    code = "IN_USE"


class ValidationFailed(AppError):
    """Business validation that Pydantic cannot express (broken references, etc.).

    `details` is a list of {"loc": [...], "msg": "..."} like request validation errors.
    """

    status_code = 422
    code = "VALIDATION_ERROR"


class RateLimited(AppError):
    status_code = 429
    code = "RATE_LIMITED"
