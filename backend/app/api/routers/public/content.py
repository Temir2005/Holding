from fastapi import APIRouter, HTTPException

from app.api.deps import MapperDep, RepoDep
from app.models import ProjectStatus
from app.schemas.entities import ClientRead, PersonRead, ProjectCard, ProjectRead, VacancyRead
from app.schemas.pages import PageRead
from app.schemas.site import SiteSettingsRead
from app.services.pages import PageService
from app.services.site import SiteService

router = APIRouter(tags=["content"])


@router.get("/settings", response_model=SiteSettingsRead)
async def get_settings(repo: RepoDep, mapper: MapperDep) -> SiteSettingsRead:
    result = await SiteService(repo, mapper).get(mapper.locale)
    if result is None:
        raise HTTPException(404, "Site settings are not configured. Run `make seed`.")
    return result


@router.get("/pages/{slug}", response_model=PageRead)
async def get_page(slug: str, repo: RepoDep, mapper: MapperDep) -> PageRead:
    page = await PageService(repo, mapper).get(slug, mapper.locale)
    if page is None:
        raise HTTPException(404, "Page not found")
    return page


@router.get("/projects", response_model=list[ProjectCard])
async def list_projects(
    repo: RepoDep,
    mapper: MapperDep,
    division: str | None = None,
    status: ProjectStatus | None = None,
    featured: bool | None = None,
) -> list[ProjectCard]:
    rows = await repo.projects(division_slug=division, status=status, featured=featured)
    return [mapper.project_card(p) for p in rows]


@router.get("/projects/{slug}", response_model=ProjectRead)
async def get_project(slug: str, repo: RepoDep, mapper: MapperDep) -> ProjectRead:
    project = await repo.project_by_slug(slug)
    if project is None:
        raise HTTPException(404, "Project not found")
    return mapper.project(project)


@router.get("/people", response_model=list[PersonRead])
async def list_people(
    repo: RepoDep, mapper: MapperDep, division: str | None = None, key: bool | None = None
) -> list[PersonRead]:
    return [mapper.person(p) for p in await repo.people(division_slug=division, key=key)]


@router.get("/clients", response_model=list[ClientRead])
async def list_clients(repo: RepoDep, mapper: MapperDep) -> list[ClientRead]:
    return [mapper.client(c) for c in await repo.clients()]


@router.get("/vacancies", response_model=list[VacancyRead])
async def list_vacancies(repo: RepoDep, mapper: MapperDep) -> list[VacancyRead]:
    return [mapper.vacancy(v) for v in await repo.vacancies()]
