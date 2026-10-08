from typing import ClassVar

from sqlalchemy import select

from app.models import Lead, SiteSettings
from app.repositories.admin.base import AdminRepository


class SettingsRepository(AdminRepository[SiteSettings]):
    model = SiteSettings

    async def the_row(self) -> SiteSettings | None:
        """The settings are a single row, created by the seeds."""
        row: SiteSettings | None = await self.session.scalar(select(SiteSettings).limit(1))
        return row


class LeadRepository(AdminRepository[Lead]):
    model = Lead
    search_columns = (Lead.name, Lead.phone, Lead.email, Lead.message, Lead.manager_note)
    sort_columns: ClassVar = {
        "created_at": Lead.created_at,
        "status": Lead.status,
        "type": Lead.type,
        "name": Lead.name,
    }
    default_order = (Lead.created_at.desc(), Lead.id)
