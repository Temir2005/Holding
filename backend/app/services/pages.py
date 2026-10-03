"""Page assembly: validate section data, resolve live queries, expand references."""

import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

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


class RefLoader:
    """Loads referenced entities in one query per kind and maps them to read models."""

    def __init__(self, repo: ContentRepository, mapper: Mapper) -> None:
        self.repo = repo
        self.m = mapper

    async def load(self, refs: RefIds) -> dict[RefKind, dict[Any, BaseModel]]:
        out: dict[RefKind, dict[Any, BaseModel]] = {}
        r, m = self.repo, self.m
        for kind, ids in refs.items():
            if not ids:
                continue
            match kind:
                case RefKind.media:
                    rows = await r.media_by_ids(ids)
                    out[kind] = {k: v for k, v in ((k, m.media(v)) for k, v in rows.items()) if v}
                case RefKind.project:
                    out[kind] = _map(await r.published_by_ids(Project, ids), m.project_card)
                case RefKind.person:
                    out[kind] = _map(await r.published_by_ids(Person, ids), m.person)
                case RefKind.client:
                    out[kind] = _map(await r.published_by_ids(Client, ids), m.client)
                case RefKind.division:
                    out[kind] = _map(await r.published_by_ids(Division, ids), m.division)
                case RefKind.timeline_event:
                    out[kind] = _map(await r.published_by_ids(TimelineEvent, ids), m.timeline_event)
                case RefKind.stat:
                    out[kind] = _map(await r.published_by_ids(Stat, ids), m.stat)
                case RefKind.vacancy:
                    out[kind] = _map(await r.published_by_ids(Vacancy, ids), m.vacancy)
        return out


def _map(rows: dict[Any, Any], fn: Callable[[Any], BaseModel]) -> dict[Any, BaseModel]:
    return {k: fn(v) for k, v in rows.items()}


class PageService:
    def __init__(self, repo: ContentRepository, mapper: Mapper) -> None:
        self.repo = repo
        self.mapper = mapper

    async def get(self, slug: str, locale: Locale) -> PageRead | None:
        page = await self.repo.page_with_sections(slug)
        if page is None:
            return None

        prepared: list[tuple[Section, SectionType, SectionData]] = []
        for section in self.repo.visible_sections(page):
            parsed = self._parse(section)
            if parsed is None:
                continue
            stype, data = parsed
            hook = HOOKS.get(stype)
            if hook is not None:
                data = await hook(data, self.repo)
            prepared.append((section, stype, data))

        refs: RefIds = defaultdict(set)
        for _, _, data in prepared:
            collect_refs(data, refs)
        loaded = await RefLoader(self.repo, self.mapper).load(refs)

        sections: list[SectionBase] = []
        for section, stype, data in prepared:
            envelope = SECTION_SCHEMAS[stype].read
            sections.append(
                envelope.model_validate(
                    {
                        "id": section.id,
                        "type": stype.value,
                        "anchor": section.anchor,
                        "tone": section.tone,
                        "data": expand(data, locale, loaded),
                    }
                )
            )

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
                "sections": sections,
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
