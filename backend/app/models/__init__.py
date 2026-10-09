"""All ORM models. Importing this package registers every table on Base.metadata."""

from app.models.audit import AuditLog
from app.models.base import Base
from app.models.entities import (
    Client,
    Division,
    EmploymentType,
    Person,
    Project,
    ProjectMedia,
    ProjectStatus,
    Stat,
    TimelineEvent,
    Vacancy,
)
from app.models.lead import Lead, LeadStatus, LeadType
from app.models.media import Media, MediaStatus
from app.models.revision import PageRevision
from app.models.site import Page, Section, SiteSettings
from app.models.user import AdminUser, RefreshToken, UserRole

__all__ = [
    "AdminUser",
    "AuditLog",
    "Base",
    "Client",
    "Division",
    "EmploymentType",
    "Lead",
    "LeadStatus",
    "LeadType",
    "Media",
    "MediaStatus",
    "Page",
    "PageRevision",
    "Person",
    "Project",
    "ProjectMedia",
    "ProjectStatus",
    "RefreshToken",
    "Section",
    "SiteSettings",
    "Stat",
    "TimelineEvent",
    "UserRole",
    "Vacancy",
]
