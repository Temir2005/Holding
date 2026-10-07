from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.admin.auth import REFRESH_COOKIE
from app.models import AdminUser, AuditLog, RefreshToken
from tests.conftest import PASSWORD, auth_header, make_user

LOGIN = "/api/v1/admin/auth/login"
REFRESH = "/api/v1/admin/auth/refresh"


async def login(client: AsyncClient, email: str, password: str = PASSWORD) -> dict[str, object]:
    res = await client.post(LOGIN, json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return dict(res.json())


async def test_login_returns_access_token_and_httponly_cookie(
    client: AsyncClient, editor: AdminUser
) -> None:
    res = await client.post(LOGIN, json={"email": "Editor@MegaSmart.kz", "password": PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer" and body["user"]["role"] == "editor"
    cookie = res.headers["set-cookie"]
    assert f"{REFRESH_COOKIE}=" in cookie
    assert "HttpOnly" in cookie and "Path=/api/v1/admin/auth" in cookie
    assert "samesite=strict" in cookie.lower()

    me = await client.get(
        "/api/v1/admin/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"}
    )
    assert me.json()["email"] == "editor@megasmart.kz"


async def test_wrong_password_and_unknown_email_look_the_same(
    client: AsyncClient, editor: AdminUser
) -> None:
    wrong = await client.post(LOGIN, json={"email": editor.email, "password": "nope-nope-nope"})
    unknown = await client.post(LOGIN, json={"email": "who@megasmart.kz", "password": "x"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"] == unknown.json()["error"]
    assert wrong.json()["error"]["code"] == "BAD_CREDENTIALS"


async def test_inactive_user_cannot_sign_in(client: AsyncClient, session: AsyncSession) -> None:
    await make_user(session, "gone@megasmart.kz", "editor", is_active=False)
    res = await client.post(LOGIN, json={"email": "gone@megasmart.kz", "password": PASSWORD})
    assert (res.status_code, res.json()["error"]["code"]) == (403, "USER_INACTIVE")


async def test_login_is_rate_limited(client: AsyncClient, editor: AdminUser) -> None:
    codes = [
        (await client.post(LOGIN, json={"email": editor.email, "password": "bad"})).status_code
        for _ in range(11)
    ]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429


async def test_refresh_rotates_and_reuse_revokes_family(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    await login(client, editor.email)
    first = client.cookies.get(REFRESH_COOKIE)

    rotated = await client.post(REFRESH)
    assert rotated.status_code == 200
    second = client.cookies.get(REFRESH_COOKIE)
    assert second and second != first

    # Someone replays the old cookie: the whole session family is revoked.
    client.cookies.set(REFRESH_COOKIE, first or "", path="/api/v1/admin/auth")
    replay = await client.post(REFRESH)
    assert replay.json()["error"]["code"] == "REFRESH_TOKEN_REUSED"

    client.cookies.set(REFRESH_COOKIE, second or "", path="/api/v1/admin/auth")
    assert (await client.post(REFRESH)).status_code == 401
    active = await session.scalar(
        select(func.count()).select_from(RefreshToken).where(RefreshToken.revoked_at.is_(None))
    )
    assert active == 0


async def test_expired_refresh_token_is_rejected(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    await login(client, editor.email)
    token = await session.scalar(select(RefreshToken))
    assert token
    token.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await session.commit()
    res = await client.post(REFRESH)
    assert res.json()["error"]["code"] == "REFRESH_TOKEN_EXPIRED"


async def test_logout_revokes_the_session(client: AsyncClient, editor: AdminUser) -> None:
    await login(client, editor.email)
    cookie = client.cookies.get(REFRESH_COOKIE)
    assert (await client.post("/api/v1/admin/auth/logout")).status_code == 204
    client.cookies.set(REFRESH_COOKIE, cookie or "", path="/api/v1/admin/auth")
    assert (await client.post(REFRESH)).status_code == 401


async def test_change_password_signs_out_other_sessions(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    other = await login(client, editor.email)
    other_cookie = client.cookies.get(REFRESH_COOKIE)
    old_header = {"Authorization": f"Bearer {other['access_token']}"}

    wrong = await client.post(
        "/api/v1/admin/auth/password",
        headers=old_header,
        json={"current_password": "wrong-one", "new_password": "a-brand-new-password"},
    )
    assert wrong.status_code == 422

    res = await client.post(
        "/api/v1/admin/auth/password",
        headers=old_header,
        json={"current_password": PASSWORD, "new_password": "a-brand-new-password"},
    )
    assert res.status_code == 200
    new_header = {"Authorization": f"Bearer {res.json()['access_token']}"}

    assert (await client.get("/api/v1/admin/auth/me", headers=old_header)).status_code == 401
    assert (await client.get("/api/v1/admin/auth/me", headers=new_header)).status_code == 200
    client.cookies.set(REFRESH_COOKIE, other_cookie or "", path="/api/v1/admin/auth")
    assert (await client.post(REFRESH)).status_code == 401
    assert (await login(client, editor.email, "a-brand-new-password"))["access_token"]

    actions = list(await session.scalars(select(AuditLog.action).order_by(AuditLog.created_at)))
    assert "password_change" in actions


async def test_short_new_password_is_rejected(client: AsyncClient, editor: AdminUser) -> None:
    res = await client.post(
        "/api/v1/admin/auth/password",
        headers=auth_header(editor),
        json={"current_password": PASSWORD, "new_password": "short"},
    )
    assert res.status_code == 422
    assert res.json()["error"]["details"][0]["loc"] == ["body", "new_password"]
