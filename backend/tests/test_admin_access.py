"""Roles, router-level protection, users and the audit log."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.cli import create_admin
from app.core.errors import AlreadyExists
from app.models import AdminUser, AuditLog
from tests.conftest import PASSWORD, auth_header

USERS = "/api/v1/admin/users"


@pytest.mark.parametrize("path", [USERS, "/api/v1/admin/audit-log", "/api/v1/admin/auth/me"])
async def test_no_token_is_401(client: AsyncClient, path: str) -> None:
    res = await client.get(path)
    assert (res.status_code, res.json()["error"]["code"]) == (401, "NOT_AUTHENTICATED")


async def test_garbage_token_is_401(client: AsyncClient) -> None:
    res = await client.get(USERS, headers={"Authorization": "Bearer not-a-jwt"})
    assert res.status_code == 401


@pytest.mark.parametrize("path", [USERS, "/api/v1/admin/audit-log"])
async def test_editor_cannot_reach_admin_routes(
    client: AsyncClient, editor: AdminUser, path: str
) -> None:
    res = await client.get(path, headers=auth_header(editor))
    assert (res.status_code, res.json()["error"]["code"]) == (403, "FORBIDDEN")


async def test_deactivated_user_token_stops_working(
    client: AsyncClient, admin: AdminUser, editor: AdminUser
) -> None:
    header = auth_header(editor)
    assert (await client.get("/api/v1/admin/auth/me", headers=header)).status_code == 200
    res = await client.patch(
        f"{USERS}/{editor.id}", headers=auth_header(admin), json={"version": 1, "is_active": False}
    )
    assert res.status_code == 200
    assert (await client.get("/api/v1/admin/auth/me", headers=header)).status_code == 401


async def test_admin_manages_users_and_log_records_it(
    client: AsyncClient, admin: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(admin)
    created = await client.post(
        USERS,
        headers=h,
        json={"email": "New@MegaSmart.kz", "full_name": "Новый", "password": "long-enough-pass"},
    )
    assert created.status_code == 201
    user = created.json()
    assert (user["email"], user["role"], user["version"]) == ("new@megasmart.kz", "editor", 1)

    dup = await client.post(
        USERS,
        headers=h,
        json={"email": "new@megasmart.kz", "full_name": "Двойник", "password": "long-enough-pass"},
    )
    assert (dup.status_code, dup.json()["error"]["code"]) == (409, "ALREADY_EXISTS")

    renamed = await client.patch(
        f"{USERS}/{user['id']}", headers=h, json={"version": 1, "full_name": "Переименован"}
    )
    assert renamed.json()["version"] == 2
    stale = await client.patch(
        f"{USERS}/{user['id']}", headers=h, json={"version": 1, "role": "admin"}
    )
    assert (stale.status_code, stale.json()["error"]["code"]) == (409, "VERSION_CONFLICT")

    listed = await client.get(USERS, headers=h, params={"q": "переим"})
    assert [u["full_name"] for u in listed.json()["items"]] == ["Переименован"]

    log = (
        await client.get("/api/v1/admin/audit-log", headers=h, params={"entity_type": "admin_user"})
    ).json()
    by_action = {e["action"]: e for e in log["items"]}
    assert by_action["create"]["user"]["email"] == admin.email
    assert by_action["create"]["changes"]["password_hash"] == "***"
    assert by_action["update"]["changes"] == {"full_name": ["Новый", "Переименован"]}

    rows = await session.scalars(select(AuditLog.changes))
    assert all(PASSWORD not in str(c) for c in rows)


async def test_admin_cannot_lock_themselves_out(client: AsyncClient, admin: AdminUser) -> None:
    res = await client.patch(
        f"{USERS}/{admin.id}", headers=auth_header(admin), json={"version": 1, "role": "editor"}
    )
    assert (res.status_code, res.json()["error"]["code"]) == (409, "SELF_LOCKOUT")


async def test_admin_resets_password(
    client: AsyncClient, admin: AdminUser, editor: AdminUser
) -> None:
    old = auth_header(editor)
    res = await client.post(
        f"{USERS}/{editor.id}/password",
        headers=auth_header(admin),
        json={"new_password": "reset-by-admin-1"},
    )
    assert res.status_code == 200
    assert (await client.get("/api/v1/admin/auth/me", headers=old)).status_code == 401


async def test_cli_creates_admin(client: AsyncClient, session: AsyncSession) -> None:
    factory = async_sessionmaker(session.bind, expire_on_commit=False)
    user = await create_admin(
        "boss@megasmart.kz", "Босс", "boss-password-1", session_factory=factory
    )
    assert user.role == "admin"
    res = await client.post(
        "/api/v1/admin/auth/login",
        json={"email": "boss@megasmart.kz", "password": "boss-password-1"},
    )
    assert res.status_code == 200
    entry = await session.scalar(select(AuditLog).where(AuditLog.entity_id == user.id))
    assert entry and entry.user_id is None


async def test_cli_rejects_duplicate_email(admin: AdminUser, session: AsyncSession) -> None:
    factory = async_sessionmaker(session.bind, expire_on_commit=False)
    with pytest.raises(AlreadyExists):
        await create_admin(admin.email, "Ещё", "another-password-1", session_factory=factory)
