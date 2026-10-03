import hashlib
import time
from collections import defaultdict, deque

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Lead
from app.schemas.leads import LeadCreate


class RateLimiter:
    """In-process sliding window per key.

    Good enough for one backend process. With several replicas, move this to Redis.
    """

    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True


class LeadService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    def hash_ip(self, ip: str | None) -> str | None:
        if not ip:
            return None
        return hashlib.sha256(f"{self.settings.lead_ip_salt}:{ip}".encode()).hexdigest()

    async def create(self, data: LeadCreate, *, ip: str | None, user_agent: str | None) -> Lead:
        lead = Lead(
            name=data.name.strip(),
            phone=data.phone,
            email=data.email,
            message=data.message,
            type=data.type,
            source_page=data.source_page,
            locale=data.locale.value,
            user_agent=(user_agent or "")[:512] or None,
            ip_hash=self.hash_ip(ip),
        )
        self.session.add(lead)
        await self.session.commit()
        return lead
