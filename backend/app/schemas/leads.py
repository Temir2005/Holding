import uuid

from pydantic import BaseModel, Field, model_validator

from app.core.i18n import Locale
from app.models import LeadType


class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    phone: str | None = Field(default=None, max_length=32, pattern=r"^[0-9+()\-\s]{6,32}$")
    email: str | None = Field(default=None, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    message: str | None = Field(default=None, max_length=4000)
    type: LeadType
    source_page: str | None = Field(default=None, max_length=256)
    locale: Locale = Locale.ru
    # Honeypot: hidden in the form. Real people leave it empty; bots fill it.
    website: str | None = Field(default=None, max_length=256)

    @model_validator(mode="after")
    def phone_or_email(self) -> "LeadCreate":
        if not self.phone and not self.email:
            raise ValueError("Укажите телефон или email")
        return self


class LeadCreated(BaseModel):
    id: uuid.UUID | None
    ok: bool = True
