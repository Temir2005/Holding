"""Sign-in endpoints. Login, refresh and logout work without an access token;
`me` and password change need one.

The refresh token lives in an httpOnly cookie scoped to this router's path, so
page scripts cannot read it and other endpoints never receive it. The browser
must reach the API on the same origin as the admin UI (see docs/architecture.md).
"""

from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status

from app.api.deps import ClientDep, CurrentUser, SessionDep, SettingsDep
from app.core.config import Settings, get_settings
from app.core.rate_limit import RateLimiter
from app.schemas.admin.auth import ChangePasswordRequest, LoginRequest, TokenResponse, UserRead
from app.schemas.admin.common import error_responses
from app.services.admin.auth import AuthService, Session
from app.services.admin.users import to_user_read

REFRESH_COOKIE = "ms_refresh"
COOKIE_PATH = "/api/v1/admin/auth"

router = APIRouter(prefix="/auth", tags=["admin: auth"])
login_limiter = RateLimiter(get_settings().login_rate_limit_per_minute)

RefreshCookie = Annotated[str | None, Cookie(alias=REFRESH_COOKIE, include_in_schema=False)]


def _respond(response: Response, session: Session, settings: Settings) -> TokenResponse:
    response.set_cookie(
        REFRESH_COOKIE,
        session.refresh_token,
        max_age=settings.refresh_token_ttl_days * 86400,
        path=COOKIE_PATH,
        httponly=True,
        secure=not settings.is_dev,
        samesite="strict",
    )
    response.headers["Cache-Control"] = "no-store"
    return TokenResponse(
        access_token=session.access_token,
        expires_in=settings.access_token_ttl_minutes * 60,
        user=to_user_read(session.user),
    )


def _service(session: SessionDep, settings: Settings) -> AuthService:
    return AuthService(session, settings, login_limiter)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Sign in with email and password",
    responses=error_responses(401, 403, 422, 429),
)
async def login(
    data: LoginRequest,
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
    client: ClientDep,
) -> TokenResponse:
    result = await _service(session, settings).login(data.email, data.password, client)
    return _respond(response, result, settings)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Get a new access token using the refresh cookie (rotates the cookie)",
    responses=error_responses(401),
)
async def refresh(
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
    client: ClientDep,
    refresh_token: RefreshCookie = None,
) -> TokenResponse:
    result = await _service(session, settings).refresh(refresh_token, client)
    return _respond(response, result, settings)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out this browser")
async def logout(
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
    refresh_token: RefreshCookie = None,
) -> None:
    await _service(session, settings).logout(refresh_token)
    response.delete_cookie(REFRESH_COOKIE, path=COOKIE_PATH)


@router.get("/me", response_model=UserRead, summary="Current user", responses=error_responses(401))
async def me(user: CurrentUser) -> UserRead:
    return to_user_read(user)


@router.post(
    "/password",
    response_model=TokenResponse,
    summary="Change own password; other sessions are signed out",
    responses=error_responses(401, 422),
)
async def change_password(
    data: ChangePasswordRequest,
    user: CurrentUser,
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
    client: ClientDep,
) -> TokenResponse:
    result = await _service(session, settings).change_password(
        user, data.current_password, data.new_password, client
    )
    return _respond(response, result, settings)
