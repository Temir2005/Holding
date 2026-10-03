"""Tests run against a separate Postgres database (TEST_DATABASE_URL), recreated per session."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.db import get_session
from app.main import app
from app.models import Base


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

    eng = create_async_engine(url)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
