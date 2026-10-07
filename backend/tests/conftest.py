"""Tests run against a separate Postgres database (TEST_DATABASE_URL), recreated per session.

The schema is built by running the Alembic migrations, not by `create_all`, so the
tests exercise the same schema production gets.
"""

import os
import subprocess
import sys
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.db import get_session
from app.main import app
from app.models import Base

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
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override() -> AsyncIterator[AsyncSession]:
        yield session

    app.dependency_overrides[get_session] = override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
