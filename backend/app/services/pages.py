"""Page assembly: validate section data, resolve live queries, expand references."""

import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any, NamedTuple

from pydantic import BaseModel, ValidationError

from app.core.i18n import Locale, resolve_text
from app.models import Client, Division, Person, Project, Section, Stat, TimelineEvent, Vacancy
from app.repositories.content import ContentRepository
from app.schemas.pages import PageRead, PageSeo
from app.schemas.refs import RefIds, RefKind, collect_refs, expand
from app.schemas.sections import (
    SECTION_SCHEMAS,
    ClientsGridData,
    ClientsMarqueeData,
    ProjectListData,
    ProjectsShowcaseData,
    SectionBase,
    SectionData,
    SectionType,
    StatsData,
    TeamGridData,
    TestimonialsData,
    TimelineData,
    VacanciesData,
)
from app.services.mappers import Mapper

log = logging.getLogger(__name__)

# Some sections are live queries ("every featured project") rather than fixed lists.
# A hook fills in the ids before references are expanded; explicit ids always win.
Hook = Callable[[Any, ContentRepository], Awaitable[SectionData]]


async def _stats(d: StatsData, repo: ContentRepository) -> SectionData:
    if d.stat_ids or not d.context:
        return d
    return d.model_copy(update={"stat_ids": await repo.stat_ids_for_context(d.context)})


async def _timeline(d: TimelineData, repo: ContentRepository) -> SectionData:
    return d if d.event_ids else d.model_copy(update={"event_ids": await repo.timeline_ids()})


async def _showcase(d: ProjectsShowcaseData, repo: ContentRepository) -> SectionData:
    if not d.featured:
        return d
    return d.model_copy(update={"project_ids": await repo.project_ids(featured=True)})


async def _project_list(d: ProjectListData, repo: ContentRepository) -> SectionData:
    if d.project_ids:
        return d
    ids = await repo.project_ids(division_slug=d.division_slug)
    return d.model_copy(update={"project_ids": ids})


async def _team(d: TeamGridData, repo: ContentRepository) -> SectionData:
    return d if d.person_ids else d.model_copy(update={"person_ids": await repo.person_ids(d.mode)})


async def _clients(d: ClientsGridData | ClientsMarqueeData, repo: ContentRepository) -> SectionData:
    return d if d.client_ids else d.model_copy(update={"client_ids": await repo.client_ids()})


async def _testimonials(d: TestimonialsData, repo: ContentRepository) -> SectionData:
    if d.client_ids:
        return d
    return d.model_copy(update={"client_ids": await repo.client_ids(with_testimonial=True)})


async def _vacancies(d: VacanciesData, repo: ContentRepository) -> SectionData:
    if d.vacancy_ids:
        return d
    return d.model_copy(update={"vacancy_ids": await repo.vacancy_ids(d.division_slug)})


HOOKS: dict[SectionType, Hook] = {
    SectionType.stats: _stats,
    SectionType.timeline: _timeline,
    SectionType.projects_showcase: _showcase,
    SectionType.project_list: _project_list,
    SectionType.team_grid: _team,
    SectionType.clients_marquee: _clients,
    SectionType.clients_grid: _clients,
    SectionType.testimonials: _testimonials,
    SectionType.vacancies: _vacancies,
}


# Read models of referenced entities, by kind and id (what `expand` consumes).
Loaded = dict[RefKind, dict[Any, BaseModel]]

# Collections that sections reference: the model and how a row becomes a read model.
# Only published rows are shown; media has no publication flag and is loaded separately.
PUBLISHED: dict[RefKind, tuple[type[Any], Callable[[Mapper, Any], BaseModel]]] = {
    RefKind.project: (Project, Mapper.project_card),
    RefKind.person: (Person, Mapper.person),
    RefKind.client: (Client, Mapper.client),
    RefKind.division: (Division, Mapper.division),
    RefKind.timeline_event: (TimelineEvent, Mapper.timeline_event),
    RefKind.stat: (Stat, Mapper.stat),
    RefKind.vacancy: (Vacancy, Mapper.vacancy),
}


class RefLoader:
    """Loads referenced entities in one query per kind and maps them to read models."""

    def __init__(self, repo: ContentRepository, mapper: Mapper) -> None:
        self.repo = repo
        self.m = mapper

    async def load(self, refs: RefIds) -> Loaded:
        return {kind: await self._load_kind(kind, ids) for kind, ids in refs.items() if ids}

    async def _load_kind(self, kind: RefKind, ids: set[Any]) -> dict[Any, BaseModel]:
        if kind == RefKind.media:
            media = await self.repo.media_by_ids(ids)
            return {k: read for k, row in media.items() if (read := self.m.media(row))}
        model, to_read = PUBLISHED[kind]
        rows = await self.repo.published_by_ids(model, ids)
        return {k: to_read(self.m, row) for k, row in rows.items()}


class Prepared(NamedTuple):
    """A section ready to render: valid data with its live query resolved."""

    section: Section
    type: SectionType
    data: SectionData


class PageService:
    def __init__(self, repo: ContentRepository, mapper: Mapper) -> None:
        self.repo = repo
        self.mapper = mapper

    async def get(self, slug: str, locale: Locale) -> PageRead | None:
        page = await self.repo.page_with_sections(slug)
        if page is None:
            return None
        prepared = await self._prepare(self.repo.visible_sections(page))
        loaded = await self._load_refs(prepared)
        t = self.mapper.t
        return PageRead.model_validate(
            {
                "id": page.id,
                "slug": page.slug,
                "title": t(page.title),
                "seo": PageSeo(
                    title=resolve_text(page.seo_title, locale) or t(page.title),
                    description=t(page.seo_description),
                    og_image=self.mapper.media(page.og_image),
                ),
                "sections": [self._render(p, loaded, locale) for p in prepared],
            }
        )

    async def _prepare(self, sections: list[Section]) -> list[Prepared]:
        """Parse each section and fill in its live query; invalid sections are dropped."""
        prepared = []
        for section in sections:
            parsed = self._parse(section)
            if parsed is None:
                continue
            stype, data = parsed
            hook = HOOKS.get(stype)
            if hook is not None:
                data = await hook(data, self.repo)
            prepared.append(Prepared(section, stype, data))
        return prepared

    async def _load_refs(self, prepared: list[Prepared]) -> Loaded:
        """Everything the sections reference, in one query per kind for the whole page."""
        refs: RefIds = defaultdict(set)
        for item in prepared:
            collect_refs(item.data, refs)
        return await RefLoader(self.repo, self.mapper).load(refs)

    @staticmethod
    def _render(item: Prepared, loaded: Loaded, locale: Locale) -> SectionBase:
        return SECTION_SCHEMAS[item.type].read.model_validate(
            {
                "id": item.section.id,
                "type": item.type.value,
                "anchor": item.section.anchor,
                "tone": item.section.tone,
                "data": expand(item.data, locale, loaded),
            }
        )

    @staticmethod
    def _parse(section: Section) -> tuple[SectionType, SectionData] | None:
        """Invalid sections are skipped and logged so one bad block never breaks a page."""
        try:
            stype = SectionType(section.type)
        except ValueError:
            log.error("section %s: unknown type %r", section.id, section.type)
            return None
        try:
            return stype, SECTION_SCHEMAS[stype].stored.model_validate(section.data)
        except ValidationError as exc:
            log.error("section %s (%s): invalid data: %s", section.id, stype, exc)
            return None
