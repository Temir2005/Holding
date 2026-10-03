"""`make seed`: upload placeholder images to S3 and fill the database. Safe to re-run."""

import asyncio
import logging

from app.core.db import SessionFactory, engine
from app.storage.service import get_storage
from seed.content import seed_all
from seed.seeder import Seeder

log = logging.getLogger("seed")


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    storage = get_storage()
    await storage.ensure_public_bucket()
    async with SessionFactory() as session:
        await seed_all(Seeder(session, storage))
        await session.commit()
    await engine.dispose()
    log.info("seed complete")


if __name__ == "__main__":
    asyncio.run(main())
