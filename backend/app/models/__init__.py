"""All ORM models. Importing this package registers every table on Base.metadata."""

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
from app.models.lead import Lead, LeadType
from app.models.media import Media
from app.models.site import Page, Section, SiteSettings

__all__ = [
    "Base",
    "Client",
    "Division",
    "EmploymentType",
    "Lead",
    "LeadType",
    "Media",
    "Page",
    "Person",
    "Project",
    "ProjectMedia",
    "ProjectStatus",
    "Section",
    "SiteSettings",
    "Stat",
    "TimelineEvent",
    "Vacancy",
]
