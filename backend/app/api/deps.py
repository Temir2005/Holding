from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.i18n import DEFAULT_LOCALE, Locale
from app.repositories.content import ContentRepository
from app.services.mappers import Mapper
from app.storage.service import StorageService, get_storage

SessionDep = Annotated[AsyncSession, Depends(get_session)]
StorageDep = Annotated[StorageService, Depends(get_storage)]
LocaleDep = Annotated[Locale, Query(description="Content locale; falls back to ru")]


def locale_param(locale: Locale = DEFAULT_LOCALE) -> Locale:
    return locale


def get_repo(session: SessionDep) -> ContentRepository:
    return ContentRepository(session)


def get_mapper(storage: StorageDep, locale: Annotated[Locale, Depends(locale_param)]) -> Mapper:
    return Mapper(locale, storage)


RepoDep = Annotated[ContentRepository, Depends(get_repo)]
MapperDep = Annotated[Mapper, Depends(get_mapper)]
