import uuid

from pydantic import BaseModel

from app.schemas.entities import MediaRead
from app.schemas.sections import SectionRead


class PageSeo(BaseModel):
    title: str
    description: str
    og_image: MediaRead | None


class PageRead(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    seo: PageSeo
    sections: list[SectionRead]
