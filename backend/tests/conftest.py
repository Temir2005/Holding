"""Tests run against a separate Postgres database (TEST_DATABASE_URL), recreated per session.

The schema is built by running the Alembic migrations, not by `create_all`, so the
tests exercise the same schema production gets.
"""

import os
import subprocess
import sys
from collections.abc import AsyncIterator
from pathlib import Path
from typing import TYPE_CHECKING

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.db import get_session
from app.main import app
from app.models import Base
from app.storage.memory import InMemoryStorage
from app.storage.service import get_storage

BACKEND_DIR = Path(__file__).resolve().parents[1]


def run_alembic(*args: str, database_url: str) -> subprocess.CompletedProcess[str]:
    """Run Alembic in a subprocess against `database_url` (env.py reads DATABASE_URL)."""
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env={**os.environ, "DATABASE_URL": database_url},
        capture_output=True,
        text=True,
        check=False,
    )


@pytest.fixture(scope="session")
async def engine() -> AsyncIterator[object]:
    url = get_settings().test_database_url
    assert url, "TEST_DATABASE_URL is not set"
    db_name = make_url(url).database
    admin = create_async_engine(
        make_url(url).set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    async with admin.connect() as conn:
        await conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)'))
        await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    await admin.dispose()

    migrated = run_alembic("upgrade", "head", database_url=url)
    assert migrated.returncode == 0, migrated.stderr

    eng = create_async_engine(url)
    yield eng
    await eng.dispose()


@pytest.fixture
async def session(engine: object) -> AsyncIterator[AsyncSession]:
    factory = async_sessionmaker(engine, expire_on_commit=False)  # type: ignore[call-overload]
    async with factory() as s:
        yield s
        # Each test cleans up after itself so tests stay independent.
        for table in reversed(Base.metadata.sorted_tables):
            await s.execute(table.delete())
        await s.commit()


@pytest.fixture
def storage() -> InMemoryStorage:
    return InMemoryStorage()


@pytest.fixture
async def client(session: AsyncSession, storage: InMemoryStorage) -> AsyncIterator[AsyncClient]:
    async def override() -> AsyncIterator[AsyncSession]:
        yield session

    app.dependency_overrides[get_session] = override
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


# --- admin helpers ----------------------------------------------------------------

PASSWORD = "correct-horse-battery"


@pytest.fixture(autouse=True)
def _reset_login_limiter() -> None:
    from app.api.routers.admin.auth import login_limiter

    login_limiter._hits.clear()


async def make_user(session: AsyncSession, email: str, role: str, **extra: object) -> "AdminUser":
    from datetime import UTC, datetime, timedelta

    from app.core.security import hash_password
    from app.models import AdminUser, UserRole

    user = AdminUser(
        email=email,
        full_name=email.split("@")[0].title(),
        role=UserRole(role),
        password_hash=hash_password(PASSWORD),
        # A little in the past, so tokens issued right now are newer than the password.
        password_changed_at=datetime.now(UTC) - timedelta(seconds=5),
        **extra,
    )
    session.add(user)
    await session.commit()
    return user


def auth_header(user: "AdminUser") -> dict[str, str]:
    from app.core.security import create_access_token

    return {"Authorization": f"Bearer {create_access_token(get_settings(), user.id, user.role)}"}


async def publish(session: AsyncSession, page: "Page") -> None:
    """Put a page written straight to the database on the site, as the seeds do."""
    from app.services.admin.audit import NullAuditWriter
    from app.services.admin.publishing import PublishingService

    publisher = PublishingService(
        session, NullAuditWriter(), InMemoryStorage(), get_settings(), acting_user=None
    )
    await publisher.publish_now(page, None)
    await session.commit()


@pytest.fixture
async def admin(session: AsyncSession) -> "AdminUser":
    return await make_user(session, "admin@megasmart.kz", "admin")


@pytest.fixture
async def editor(session: AsyncSession) -> "AdminUser":
    return await make_user(session, "editor@megasmart.kz", "editor")


if TYPE_CHECKING:
    from app.models import AdminUser, Page
