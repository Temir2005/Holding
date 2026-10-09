"""`make seed`: fill an empty database with the starter content and its images.

Bootstrap only. Seeds run when the database has no content yet, the sign being that
there is no `site_settings` row: it is a singleton the admin cannot delete, and the
seeds create it in the same transaction as everything else. Otherwise they stop and
change nothing, so editors' work is never overwritten and pages they took down stay
down. That makes `SEED_ON_DEPLOY=true` safe on every deploy.

Why not "insert what is missing": that would bring back rows editors deleted.

`--force` writes the seed content over the existing one (seeded rows are updated
in place, changed pages republished). It is refused unless APP_ENV=dev.

Everything is written in one transaction under an advisory lock, so two deploys
starting at once cannot both seed; the log records the run as done by the system.
"""

import argparse
import asyncio
import logging
import sys
from dataclasses import dataclass
from enum import StrEnum

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import SessionFactory, engine
from app.models import SiteSettings
from app.services.admin.audit import DbAuditWriter
from app.storage.service import Storage, get_storage
from seed.content import seed_all
from seed.seeder import Seeder

log = logging.getLogger("seed")

# Any constant: the key of the Postgres advisory lock that serializes seed runs.
SEED_LOCK = 4_242_001


class Outcome(StrEnum):
    seeded = "seeded"
    skipped = "skipped"  # the database already has content
    refused = "refused"  # --force outside dev


@dataclass(frozen=True)
class SeedResult:
    outcome: Outcome
    message: str


async def has_content(session: AsyncSession) -> bool:
    return await session.scalar(select(SiteSettings.id).limit(1)) is not None


async def run_seed(
    session: AsyncSession, storage: Storage, settings: Settings, *, force: bool = False
) -> SeedResult:
    if force and not settings.is_dev:
        return SeedResult(
            Outcome.refused,
            f"--force перезаписывает контент и разрешён только при APP_ENV=dev "
            f"(сейчас APP_ENV={settings.app_env}). Ничего не изменено.",
        )
    # Held until commit or rollback: a second run waits here, then sees the content.
    await session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": SEED_LOCK})
    if not force and await has_content(session):
        await session.rollback()
        return SeedResult(
            Outcome.skipped,
            "В базе уже есть контент (есть настройки сайта): сиды пропущены, правки сохранены.",
        )
    await storage.ensure_public_bucket()
    await seed_all(Seeder(session, storage))
    await DbAuditWriter(session, user_id=None).record(
        action="seed",
        entity_type="site",
        entity_id=None,
        changes={"mode": "force" if force else "bootstrap"},
    )
    await session.commit()
    return SeedResult(
        Outcome.seeded, "Стартовый контент перезаписан." if force else "Стартовый контент создан."
    )


async def main(force: bool) -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    async with SessionFactory() as session:
        result = await run_seed(session, get_storage(), get_settings(), force=force)
    await engine.dispose()
    log.info("seed %s: %s", result.outcome, result.message)
    return 1 if result.outcome == Outcome.refused else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fill an empty database with starter content")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing content with the seed content (APP_ENV=dev only)",
    )
    sys.exit(asyncio.run(main(parser.parse_args().force)))
