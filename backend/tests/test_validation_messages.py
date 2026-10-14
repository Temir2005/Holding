"""Russian messages for pydantic errors in the admin API (app/core/validation_messages.py)."""

import uuid
from typing import Annotated, Any, Literal

import pytest
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, ValidationError

from app.core.validation_messages import ru_message


def must_be_even(value: int) -> int:
    if value % 2:
        raise ValueError("число должно быть чётным")
    return value


class Sample(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=3, max_length=5)
    code: str = Field(default="ab", pattern=r"^[a-z]+$")
    filled: str = Field(default="x", min_length=1)
    size: int = Field(default=1, ge=1, le=10)
    kind: Literal["a", "b"] = "a"
    ref: uuid.UUID | None = None
    tags: list[str] = Field(default_factory=lambda: ["t"], min_length=1)
    even: Annotated[int, AfterValidator(must_be_even)] = 2


def first_message(**data: Any) -> str:
    with pytest.raises(ValidationError) as exc:
        Sample.model_validate({"name": "abcd", **data})
    errors = exc.value.errors()
    return ru_message(errors[0])


@pytest.mark.parametrize(
    ("data", "message"),
    [
        ({"name": "ab"}, "Не короче 3 символов"),
        ({"name": "abcdef"}, "Не длиннее 5 символов"),
        ({"filled": ""}, "Заполните поле"),
        ({"code": "AB"}, "Неверный формат"),
        ({"size": 0}, "Не меньше 1"),
        ({"size": 11}, "Не больше 10"),
        ({"size": "много"}, "Нужно целое число"),
        ({"kind": "c"}, "Допустимые значения: 'a', 'b'"),
        ({"ref": "not-a-uuid"}, "Нужен идентификатор (UUID)"),
        ({"tags": []}, "Минимум элементов: 1"),
        ({"name": 5}, "Нужен текст"),
        ({"surprise": 1}, "Лишнее поле"),
        ({"even": 3}, "Число должно быть чётным"),
    ],
)
def test_messages_are_built_from_type_and_limits(data: dict[str, Any], message: str) -> None:
    assert first_message(**data) == message


def test_missing_field() -> None:
    with pytest.raises(ValidationError) as exc:
        Sample.model_validate({})
    assert ru_message(exc.value.errors()[0]) == "Обязательное поле"


def test_unknown_error_type_has_a_neutral_message() -> None:
    assert ru_message({"type": "something_new", "msg": "Whatever"}) == "Неверное значение"
