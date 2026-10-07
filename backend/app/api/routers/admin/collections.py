"""Collections: divisions, projects, people, clients, timeline, stats, vacancies.

Each collection gets the same six endpoints from `crud_routes` (list, create, get,
update, delete, reorder). Its filters, schemas and extra actions (project gallery)
are declared next to it below.
"""

import uuid
from collections.abc import Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuditDep, SessionDep, StorageDep
from app.models import Client, Division, Person, Project, Stat, TimelineEvent, Vacancy
from app.schemas.admin import collections as s
from app.schemas.admin.common import ListParams, Paginated, ReorderRequest, error_responses
from app.services.admin import collections as svc
from app.services.admin.audit import AuditWriter
from app.services.admin.collections import CollectionService
from app.storage.service import Storage

router = APIRouter()


def crud_routes(
    prefix: str,
    tag: str,
    label: str,
    service: Callable[..., CollectionService[Any, Any, Any, Any]],
    create: type[BaseModel],
    update: type[BaseModel],
    read: type[BaseModel],
    filters: type[BaseModel],
    where: Callable[[Any], list[Any]],
) -> APIRouter:
    """The standard endpoints of one collection. `where` turns filters into conditions.

    The schemas arrive as variables and are used as annotations: FastAPI reads them at
    runtime to validate requests and build OpenAPI. Mypy cannot check a variable used as
    a type, hence the `type: ignore[valid-type]` on exactly those annotations.
    """
    r = APIRouter(prefix=prefix, tags=[tag])
    Service = Annotated[CollectionService[Any, Any, Any, Any], Depends(service)]

    @r.get("", response_model=Paginated[read], summary=f"{label}: list")  # type: ignore[valid-type]
    async def list_items(
        svc_: Service,
        params: Annotated[ListParams, Depends()],
        flt: Annotated[filters, Depends()],  # type: ignore[valid-type]
    ) -> Any:
        return await svc_.list(params, *where(flt))

    @r.post(
        "",
        response_model=read,
        status_code=status.HTTP_201_CREATED,
        summary=f"{label}: create",
        responses=error_responses(409, 422),
    )
    async def create_item(data: create, svc_: Service) -> Any:  # type: ignore[valid-type]
        return await svc_.create(data)

    @r.put(
        "/order",
        status_code=status.HTTP_204_NO_CONTENT,
        summary=f"{label}: reorder (all ids, in the new order)",
        responses=error_responses(409),
    )
    async def reorder_items(data: ReorderRequest, svc_: Service) -> None:
        await svc_.reorder(data.ids)

    @r.get(
        "/{item_id}", response_model=read, summary=f"{label}: get", responses=error_responses(404)
    )
    async def get_item(item_id: uuid.UUID, svc_: Service) -> Any:
        return await svc_.read(item_id)

    @r.patch(
        "/{item_id}",
        response_model=read,
        summary=f"{label}: edit (publish with is_published)",
        responses=error_responses(404, 409, 422),
    )
    async def update_item(item_id: uuid.UUID, data: update, svc_: Service) -> Any:  # type: ignore[valid-type]
        return await svc_.update(item_id, data)

    @r.delete(
        "/{item_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        summary=f"{label}: delete; refused while pages use it",
        responses=error_responses(404, 409),
    )
    async def delete_item(
        item_id: uuid.UUID, svc_: Service, version: Annotated[int, Query(ge=1)]
    ) -> None:
        await svc_.delete(item_id, version)

    return r


def published(model: Any, flt: Any) -> list[Any]:
    return [model.is_published.is_(flt.is_published)] if flt.is_published is not None else []


def factory(
    cls: Callable[[AsyncSession, AuditWriter, Storage], CollectionService[Any, Any, Any, Any]],
) -> Callable[..., Any]:
    def make(session: SessionDep, audit: AuditDep, storage: StorageDep) -> Any:
        return cls(session, audit, storage)

    return make


# --- divisions -------------------------------------------------------------------------

router.include_router(
    crud_routes(
        "/divisions", "admin: divisions", "Divisions", factory(svc.DivisionService),
        s.DivisionCreate, s.DivisionUpdate, s.DivisionAdminRead, s.PublishedFilter,
        lambda f: published(Division, f),
    )
)  # fmt: skip


# --- projects --------------------------------------------------------------------------


def project_where(f: s.ProjectFilters) -> list[Any]:
    conds = published(Project, f)
    if f.division_id:
        conds.append(Project.division_id == f.division_id)
    if f.status:
        conds.append(Project.status == f.status)
    if f.is_featured is not None:
        conds.append(Project.is_featured.is_(f.is_featured))
    return conds


projects = crud_routes(
    "/projects", "admin: projects", "Projects", factory(svc.ProjectService),
    s.ProjectCreate, s.ProjectUpdate, s.ProjectAdminRead, s.ProjectFilters, project_where,
)  # fmt: skip


def project_service(
    session: SessionDep, audit: AuditDep, storage: StorageDep
) -> svc.ProjectService:
    return svc.ProjectService(session, audit, storage)


@projects.put(
    "/{item_id}/gallery",
    response_model=s.ProjectAdminRead,
    summary="Projects: replace the gallery (ordered media ids)",
    responses=error_responses(404, 409, 422),
)
async def set_gallery(
    item_id: uuid.UUID,
    data: s.GalleryUpdate,
    service: Annotated[svc.ProjectService, Depends(project_service)],
) -> s.ProjectAdminRead:
    return await service.set_gallery(item_id, data)


router.include_router(projects)


# --- people, clients, timeline, stats, vacancies -----------------------------------------


def person_where(f: s.PersonFilters) -> list[Any]:
    conds = published(Person, f)
    if f.division_id:
        conds.append(Person.division_id == f.division_id)
    if f.is_key is not None:
        conds.append(Person.is_key.is_(f.is_key))
    return conds


def client_where(f: s.ClientFilters) -> list[Any]:
    conds = published(Client, f)
    if f.industry:
        conds.append(Client.industry == f.industry)
    if f.has_testimonial is not None:
        conds.append(
            Client.testimonial.is_not(None) if f.has_testimonial else Client.testimonial.is_(None)
        )
    return conds


def stat_where(f: s.StatFilters) -> list[Any]:
    conds = published(Stat, f)
    if f.context:
        conds.append(Stat.context == f.context)
    return conds


def vacancy_where(f: s.VacancyFilters) -> list[Any]:
    conds = published(Vacancy, f)
    if f.division_id:
        conds.append(Vacancy.division_id == f.division_id)
    if f.is_open is not None:
        conds.append(Vacancy.is_open.is_(f.is_open))
    return conds


for collection in (
    crud_routes(
        "/people", "admin: people", "People", factory(svc.PersonService),
        s.PersonCreate, s.PersonUpdate, s.PersonAdminRead, s.PersonFilters, person_where,
    ),
    crud_routes(
        "/clients", "admin: clients", "Clients", factory(svc.ClientService),
        s.ClientCreate, s.ClientUpdate, s.ClientAdminRead, s.ClientFilters, client_where,
    ),
    crud_routes(
        "/timeline-events", "admin: timeline", "Timeline events", factory(svc.TimelineEventService),
        s.TimelineEventCreate, s.TimelineEventUpdate, s.TimelineEventAdminRead, s.PublishedFilter,
        lambda f: published(TimelineEvent, f),
    ),
    crud_routes(
        "/stats", "admin: stats", "Stats", factory(svc.StatService),
        s.StatCreate, s.StatUpdate, s.StatAdminRead, s.StatFilters, stat_where,
    ),
    crud_routes(
        "/vacancies", "admin: vacancies", "Vacancies", factory(svc.VacancyService),
        s.VacancyCreate, s.VacancyUpdate, s.VacancyAdminRead, s.VacancyFilters, vacancy_where,
    ),
):  # fmt: skip
    router.include_router(collection)
