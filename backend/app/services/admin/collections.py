"""Admin services of the collections: divisions, projects, people, clients, timeline, stats,
vacancies.

`CollectionService` adds what they all share on top of CrudService:
- localized text is stored with only the languages that have text;
- referenced files and divisions must exist (files fully uploaded);
- read models carry cards of referenced objects, loaded in one query per kind;
- deletion is refused while sections reference the row (409 with the places).

Each entity below states its own columns, references and checks.
"""

import uuid
from collections.abc import Sequence
from typing import Any, ClassVar

from pydantic import AnyUrl, BaseModel
from pydantic_core import Url
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AlreadyExists, InUse, ValidationFailed
from app.core.i18n import Locale
from app.models import Client, Division, Page, Person, Project, Stat, TimelineEvent, Vacancy
from app.repositories.admin.collections import (
    ClientRepository,
    DivisionRepository,
    PersonRepository,
    ProjectRepository,
    StatRepository,
    TimelineEventRepository,
    VacancyRepository,
)
from app.schemas.admin.collections import (
    ClientAdminRead,
    ClientCreate,
    ClientUpdate,
    DivisionAdminRead,
    DivisionCreate,
    DivisionUpdate,
    GalleryUpdate,
    PersonAdminRead,
    PersonCreate,
    PersonUpdate,
    ProjectAdminRead,
    ProjectCreate,
    ProjectUpdate,
    StatAdminRead,
    StatCreate,
    StatUpdate,
    TimelineEventAdminRead,
    TimelineEventCreate,
    TimelineEventUpdate,
    VacancyAdminRead,
    VacancyCreate,
    VacancyUpdate,
)
from app.schemas.admin.common import Usage, VersionedUpdate
from app.schemas.admin.pages import RefCard
from app.schemas.refs import RefKind
from app.services.admin.audit import AuditWriter
from app.services.admin.base import CrudService, ensure_version, row
from app.services.admin.refs import KIND_LABELS, RefService
from app.services.admin.usage import UsageFinder
from app.storage.service import Storage

LANGS = {loc.value for loc in Locale}


def clean(value: Any) -> Any:
    """Drop empty languages from localized dicts (also nested) and turn URLs into strings."""
    if isinstance(value, AnyUrl | Url):
        return str(value)
    if isinstance(value, dict):
        if value and set(value) <= LANGS:
            return {k: v for k, v in value.items() if v is not None}
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value


class CollectionService[M: Any, C: BaseModel, U: VersionedUpdate, R: BaseModel](
    CrudService[M, C, U, R]
):
    model: ClassVar[type[Any]]
    # Localized columns: stored as {} when cleared.
    text_fields: ClassVar[tuple[str, ...]] = ()
    # Columns holding ids of other objects, with the kind of object.
    ref_fields: ClassVar[dict[str, RefKind]] = {}
    # How sections reference this collection (None if they cannot).
    ref_kind: ClassVar[RefKind | None] = None

    def __init__(
        self, session: AsyncSession, repo: Any, audit: AuditWriter, storage: Storage
    ) -> None:
        super().__init__(session, repo, audit)
        self.refs = RefService(session, storage)
        self._cards: dict[RefKind, dict[uuid.UUID, RefCard]] = {}
        self._next_sort_order = 0

    # --- column values -----------------------------------------------------------------

    def values(self, changes: dict[str, Any]) -> dict[str, Any]:
        out = {k: clean(v) for k, v in changes.items()}
        for name in self.text_fields:
            if name in out and out[name] is None:
                out[name] = {}
        return out

    def build(self, data: C) -> M:
        obj: M = self.model(**self.values(data.model_dump()), sort_order=self._next_sort_order)
        return obj

    async def create(self, data: C) -> R:
        # New rows go to the end of the list.
        last = await self.session.scalar(select(func.max(self.model.sort_order)))
        self._next_sort_order = (last or 0) + 10
        return await super().create(data)

    def apply(self, obj: M, changes: dict[str, Any]) -> None:
        super().apply(obj, self.values(changes))

    # --- references ----------------------------------------------------------------------

    async def validate(self, obj: M) -> None:
        errors = []
        for name, kind in self.ref_fields.items():
            ref_id = getattr(obj, name)
            if ref_id is not None and ref_id not in await self.refs.existing(kind, [ref_id]):
                errors.append(
                    {"loc": ["body", name], "msg": f"{KIND_LABELS[kind]} не найден: {ref_id}"}
                )
        if errors:
            raise ValidationFailed("Есть ссылки на несуществующие объекты", details=errors)

    async def load_cards(
        self, rows: Sequence[M], extra: dict[RefKind, set[uuid.UUID]] | None = None
    ) -> None:
        wanted: dict[RefKind, set[uuid.UUID]] = {k: set(v) for k, v in (extra or {}).items()}
        for name, kind in self.ref_fields.items():
            wanted.setdefault(kind, set()).update(
                ref_id for r in rows if (ref_id := getattr(r, name)) is not None
            )
        self._cards = {kind: await self.refs.cards_for(kind, ids) for kind, ids in wanted.items()}

    def card(self, kind: RefKind, ref_id: uuid.UUID | None) -> RefCard | None:
        return self._cards.get(kind, {}).get(ref_id) if ref_id else None

    async def present_many(self, rows: Sequence[M]) -> list[R]:
        await self.load_cards(rows)
        return [self.to_read(r) for r in rows]

    # --- deletion ------------------------------------------------------------------------

    async def usages(self, obj: M) -> list[Usage]:
        if self.ref_kind is None:
            return []
        return await UsageFinder(self.session).entity(self.ref_kind, row(obj).id)

    async def before_delete(self, obj: M) -> None:
        usages = await self.usages(obj)
        if usages:
            raise InUse(
                f"{self.entity_label}: запись используется, сначала уберите её из этих мест",
                details=[u.model_dump(mode="json") for u in usages],
            )


def common(obj: Any) -> dict[str, Any]:
    return {
        "id": obj.id,
        "is_published": obj.is_published,
        "sort_order": obj.sort_order,
        "created_at": obj.created_at,
        "updated_at": obj.updated_at,
        "version": obj.version,
    }


async def ensure_unique_slug(session: AsyncSession, model: Any, obj: Any) -> None:
    taken = await session.scalar(
        select(model.id).where(model.slug == obj.slug, model.id != obj.id).limit(1)
    )
    if taken is not None:
        raise AlreadyExists(
            f"Адрес «{obj.slug}» уже занят",
            details=[{"loc": ["body", "slug"], "msg": "already exists"}],
        )


# --- divisions -----------------------------------------------------------------------


class DivisionService(
    CollectionService[Division, DivisionCreate, DivisionUpdate, DivisionAdminRead]
):
    entity_type = "division"
    entity_label = "Направление"
    model = Division
    text_fields = ("name", "tagline", "description")
    ref_fields: ClassVar = {"logo_id": RefKind.media, "cover_id": RefKind.media}
    ref_kind = RefKind.division

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        super().__init__(session, DivisionRepository(session), audit, storage)
        self._old_slug: str | None = None

    def apply(self, obj: Division, changes: dict[str, Any]) -> None:
        self._old_slug = obj.slug
        super().apply(obj, changes)

    def to_read(self, obj: Division) -> DivisionAdminRead:
        return DivisionAdminRead(
            **common(obj),
            slug=obj.slug,
            name=obj.name,
            tagline=obj.tagline,
            description=obj.description,
            logo_id=obj.logo_id,
            logo=self.card(RefKind.media, obj.logo_id),
            cover_id=obj.cover_id,
            cover=self.card(RefKind.media, obj.cover_id),
            stats=list(obj.stats),
            website_url=obj.website_url,
            page_slug=obj.page_slug,
        )

    async def validate(self, obj: Division) -> None:
        await super().validate(obj)
        await ensure_unique_slug(self.session, Division, obj)
        if obj.page_slug and not await self.session.scalar(
            select(Page.id).where(Page.slug == obj.page_slug)
        ):
            raise ValidationFailed(
                "Нет такой страницы",
                details=[{"loc": ["body", "page_slug"], "msg": f"нет страницы «{obj.page_slug}»"}],
            )
        if self._old_slug and self._old_slug != obj.slug:
            usages = await UsageFinder(self.session).division(obj.id, self._old_slug)
            filtered = [u for u in usages if u.field == "data.division_slug"]
            if filtered:
                raise InUse(
                    "Блоки страниц отбирают проекты по старому адресу направления",
                    details=[u.model_dump(mode="json") for u in filtered],
                )

    async def usages(self, obj: Division) -> list[Usage]:
        return await UsageFinder(self.session).division(obj.id, obj.slug)


# --- projects ------------------------------------------------------------------------


class ProjectService(CollectionService[Project, ProjectCreate, ProjectUpdate, ProjectAdminRead]):
    entity_type = "project"
    entity_label = "Проект"
    model = Project
    text_fields = ("title", "location", "short_description", "body")
    ref_fields: ClassVar = {"cover_id": RefKind.media, "division_id": RefKind.division}
    ref_kind = RefKind.project

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        self.projects = ProjectRepository(session)
        super().__init__(session, self.projects, audit, storage)
        self._old_slug: str | None = None
        self._galleries: dict[uuid.UUID, list[uuid.UUID]] = {}

    def apply(self, obj: Project, changes: dict[str, Any]) -> None:
        self._old_slug = obj.slug
        super().apply(obj, changes)

    async def present_many(self, rows: Sequence[Project]) -> list[ProjectAdminRead]:
        self._galleries = await self.projects.galleries([r.id for r in rows])
        media = {m for ids in self._galleries.values() for m in ids}
        await self.load_cards(rows, extra={RefKind.media: media})
        return [self.to_read(r) for r in rows]

    def to_read(self, obj: Project) -> ProjectAdminRead:
        gallery = [self.card(RefKind.media, m) for m in self._galleries.get(obj.id, [])]
        return ProjectAdminRead(
            **common(obj),
            slug=obj.slug,
            title=obj.title,
            division_id=obj.division_id,
            division=self.card(RefKind.division, obj.division_id),
            status=obj.status,
            location=obj.location,
            year=obj.year,
            area_m2=float(obj.area_m2) if obj.area_m2 is not None else None,
            short_description=obj.short_description,
            body=obj.body,
            cover_id=obj.cover_id,
            cover=self.card(RefKind.media, obj.cover_id),
            gallery=[c for c in gallery if c is not None],
            tags=list(obj.tags),
            is_featured=obj.is_featured,
            is_tokenized=obj.is_tokenized,
        )

    async def validate(self, obj: Project) -> None:
        await super().validate(obj)
        await ensure_unique_slug(self.session, Project, obj)
        if self._old_slug and self._old_slug != obj.slug:
            links = [
                u
                for u in await UsageFinder(self.session).project(obj.id, self._old_slug)
                if u.field.endswith("href")
            ]
            if links:
                raise InUse(
                    "Кнопки ведут на старый адрес проекта. Сначала поменяйте ссылки.",
                    details=[u.model_dump(mode="json") for u in links],
                )

    async def usages(self, obj: Project) -> list[Usage]:
        return await UsageFinder(self.session).project(obj.id, obj.slug)

    async def set_gallery(self, project_id: uuid.UUID, data: GalleryUpdate) -> ProjectAdminRead:
        async with self.transaction():
            project = await self.get_or_404(project_id, lock=True)
            ensure_version(row(project), data.version)
            existing = await self.refs.existing(RefKind.media, data.media_ids)
            missing = [
                {"loc": ["body", "media_ids", i], "msg": f"файл не найден или не загружен: {m}"}
                for i, m in enumerate(data.media_ids)
                if m not in existing
            ]
            if missing:
                raise ValidationFailed("В галерее есть несуществующие файлы", details=missing)
            if len(set(data.media_ids)) != len(data.media_ids):
                raise ValidationFailed(
                    "Файл добавлен в галерею дважды",
                    details=[{"loc": ["body", "media_ids"], "msg": "duplicates"}],
                )
            before = (await self.projects.galleries([project.id]))[project.id]
            await self.projects.replace_gallery(project.id, data.media_ids)
            project.version += 1
            await self.session.flush()
            await self.audit.record(
                action="update",
                entity_type=self.entity_type,
                entity_id=project.id,
                changes={"gallery": [[str(m) for m in before], [str(m) for m in data.media_ids]]},
            )
            await self.session.commit()
            await self.session.refresh(project)
            return await self.present(project)


# --- people, clients, timeline, stats, vacancies -------------------------------------


class PersonService(CollectionService[Person, PersonCreate, PersonUpdate, PersonAdminRead]):
    entity_type = "person"
    entity_label = "Сотрудник"
    model = Person
    text_fields = ("full_name", "position", "bio")
    ref_fields: ClassVar = {"photo_id": RefKind.media, "division_id": RefKind.division}
    ref_kind = RefKind.person

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        super().__init__(session, PersonRepository(session), audit, storage)

    def to_read(self, obj: Person) -> PersonAdminRead:
        return PersonAdminRead(
            **common(obj),
            full_name=obj.full_name,
            position=obj.position,
            division_id=obj.division_id,
            division=self.card(RefKind.division, obj.division_id),
            bio=obj.bio,
            photo_id=obj.photo_id,
            photo=self.card(RefKind.media, obj.photo_id),
            linkedin_url=obj.linkedin_url,
            is_key=obj.is_key,
            is_founder=obj.is_founder,
        )


class ClientService(CollectionService[Client, ClientCreate, ClientUpdate, ClientAdminRead]):
    entity_type = "client"
    entity_label = "Клиент"
    model = Client
    text_fields = ("name", "industry_label", "description")
    ref_fields: ClassVar = {"logo_id": RefKind.media}
    ref_kind = RefKind.client

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        super().__init__(session, ClientRepository(session), audit, storage)

    def to_read(self, obj: Client) -> ClientAdminRead:
        return ClientAdminRead(
            **common(obj),
            name=obj.name,
            logo_id=obj.logo_id,
            logo=self.card(RefKind.media, obj.logo_id),
            industry=obj.industry,
            industry_label=obj.industry_label,
            description=obj.description,
            testimonial=obj.testimonial,
            website_url=obj.website_url,
        )


class TimelineEventService(
    CollectionService[
        TimelineEvent, TimelineEventCreate, TimelineEventUpdate, TimelineEventAdminRead
    ]
):
    entity_type = "timeline_event"
    entity_label = "Событие истории"
    model = TimelineEvent
    text_fields = ("title", "description")
    ref_fields: ClassVar = {"image_id": RefKind.media}
    ref_kind = RefKind.timeline_event

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        super().__init__(session, TimelineEventRepository(session), audit, storage)

    def to_read(self, obj: TimelineEvent) -> TimelineEventAdminRead:
        return TimelineEventAdminRead(
            **common(obj),
            year=obj.year,
            title=obj.title,
            description=obj.description,
            image_id=obj.image_id,
            image=self.card(RefKind.media, obj.image_id),
        )


class StatService(CollectionService[Stat, StatCreate, StatUpdate, StatAdminRead]):
    entity_type = "stat"
    entity_label = "Цифра"
    model = Stat
    text_fields = ("suffix", "label")
    ref_kind = RefKind.stat

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        super().__init__(session, StatRepository(session), audit, storage)

    def to_read(self, obj: Stat) -> StatAdminRead:
        return StatAdminRead(
            **common(obj),
            value=float(obj.value),
            prefix=obj.prefix,
            suffix=obj.suffix,
            label=obj.label,
            context=obj.context,
        )


class VacancyService(CollectionService[Vacancy, VacancyCreate, VacancyUpdate, VacancyAdminRead]):
    entity_type = "vacancy"
    entity_label = "Вакансия"
    model = Vacancy
    text_fields = ("title", "location", "description")
    ref_fields: ClassVar = {"division_id": RefKind.division}
    ref_kind = RefKind.vacancy

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        super().__init__(session, VacancyRepository(session), audit, storage)

    def to_read(self, obj: Vacancy) -> VacancyAdminRead:
        return VacancyAdminRead(
            **common(obj),
            title=obj.title,
            division_id=obj.division_id,
            division=self.card(RefKind.division, obj.division_id),
            location=obj.location,
            employment_type=obj.employment_type,
            description=obj.description,
            is_open=obj.is_open,
        )
