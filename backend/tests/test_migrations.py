from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings
from tests.conftest import run_alembic


async def test_models_match_migrations(engine: AsyncEngine) -> None:
    """Fails when a model changed without a migration (or the other way round)."""
    url = get_settings().test_database_url
    assert url
    result = run_alembic("check", database_url=url)
    assert result.returncode == 0, result.stdout + result.stderr
