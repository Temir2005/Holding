"""Admin repositories of the collections: which columns are searchable and sortable."""

import uuid
from collections.abc import Sequence
from typing import ClassVar

from sqlalchemy import delete, select

from app.models import Client, Division, Person, Project, ProjectMedia, Stat, TimelineEvent, Vacancy
from app.repositories.admin.base import AdminRepository


class DivisionRepository(AdminRepository[Division]):
    model = Division
    search_columns = (Division.name, Division.slug, Division.tagline)
    sort_columns: ClassVar = {"sort_order": Division.sort_order, "slug": Division.slug}
    default_order = (Division.sort_order, Division.id)


class ProjectRepository(AdminRepository[Project]):
    model = Project
    search_columns = (Project.title, Project.slug, Project.location, Project.tags)
    sort_columns: ClassVar = {
        "sort_order": Project.sort_order,
        "year": Project.year,
        "slug": Project.slug,
        "updated_at": Project.updated_at,
    }
    default_order = (Project.sort_order, Project.id)

    async def galleries(self, project_ids: Sequence[uuid.UUID]) -> dict[uuid.UUID, list[uuid.UUID]]:
        rows = await self.session.execute(
            select(ProjectMedia.project_id, ProjectMedia.media_id)
            .where(ProjectMedia.project_id.in_(project_ids))
            .order_by(ProjectMedia.project_id, ProjectMedia.sort_order)
        )
        out: dict[uuid.UUID, list[uuid.UUID]] = {pid: [] for pid in project_ids}
        for project_id, media_id in rows:
            out[project_id].append(media_id)
        return out

    async def replace_gallery(self, project_id: uuid.UUID, media_ids: Sequence[uuid.UUID]) -> None:
        await self.session.execute(
            delete(ProjectMedia).where(ProjectMedia.project_id == project_id)
        )
        for position, media_id in enumerate(media_ids):
            self.session.add(
                ProjectMedia(project_id=project_id, media_id=media_id, sort_order=position * 10)
            )


class PersonRepository(AdminRepository[Person]):
    model = Person
    search_columns = (Person.full_name, Person.position)
    sort_columns: ClassVar = {"sort_order": Person.sort_order}
    default_order = (Person.sort_order, Person.id)


class ClientRepository(AdminRepository[Client]):
    model = Client
    search_columns = (Client.name, Client.industry_label)
    sort_columns: ClassVar = {"sort_order": Client.sort_order, "industry": Client.industry}
    default_order = (Client.sort_order, Client.id)


class TimelineEventRepository(AdminRepository[TimelineEvent]):
    model = TimelineEvent
    search_columns = (TimelineEvent.title, TimelineEvent.description)
    sort_columns: ClassVar = {"year": TimelineEvent.year, "sort_order": TimelineEvent.sort_order}
    default_order = (TimelineEvent.year, TimelineEvent.sort_order, TimelineEvent.id)


class StatRepository(AdminRepository[Stat]):
    model = Stat
    search_columns = (Stat.label, Stat.context)
    sort_columns: ClassVar = {"sort_order": Stat.sort_order, "context": Stat.context}
    default_order = (Stat.context, Stat.sort_order, Stat.id)

    async def context_has_others(self, context: str, excluding: uuid.UUID) -> bool:
        """Whether another stat (not `excluding`) has this context."""
        return await self.exists(Stat.context == context, Stat.id != excluding)


class VacancyRepository(AdminRepository[Vacancy]):
    model = Vacancy
    search_columns = (Vacancy.title, Vacancy.location)
    sort_columns: ClassVar = {"sort_order": Vacancy.sort_order}
    default_order = (Vacancy.sort_order, Vacancy.id)
