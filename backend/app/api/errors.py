"""Translate errors into HTTP responses, in one place.

Admin and preview endpoints answer with {"error": {code, message, details}}.
Public endpoints keep FastAPI's default {"detail": ...}: the frontend reads it.
"""

from fastapi import FastAPI, Request
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import AppError
from app.schemas.admin.common import ErrorBody, ErrorEnvelope, FieldError

ENVELOPE_PREFIXES = ("/api/v1/admin", "/api/v1/preview")

HTTP_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
}


def uses_envelope(request: Request) -> bool:
    return request.url.path.startswith(ENVELOPE_PREFIXES)


def envelope(status: int, code: str, message: str, details: object = None) -> JSONResponse:
    body = ErrorEnvelope(error=ErrorBody(code=code, message=message, details=details))
    return JSONResponse(status_code=status, content=body.model_dump(mode="json"))


async def handle_app_error(request: Request, exc: Exception) -> Response:
    assert isinstance(exc, AppError)
    if uses_envelope(request):
        return envelope(exc.status_code, exc.code, exc.message, exc.details)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


async def handle_validation_error(request: Request, exc: Exception) -> Response:
    assert isinstance(exc, RequestValidationError)
    if not uses_envelope(request):
        return await request_validation_exception_handler(request, exc)
    fields = [
        FieldError(loc=list(err.get("loc", ())), msg=str(err.get("msg", ""))).model_dump()
        for err in exc.errors()
    ]
    return envelope(422, "VALIDATION_ERROR", "Проверьте заполнение полей", fields)


async def handle_http_error(request: Request, exc: Exception) -> Response:
    assert isinstance(exc, StarletteHTTPException)
    if not uses_envelope(request):
        return await http_exception_handler(request, exc)
    code = HTTP_CODES.get(exc.status_code, "HTTP_ERROR")
    response = envelope(exc.status_code, code, str(exc.detail))
    if exc.headers:
        response.headers.update(exc.headers)
    return response


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
