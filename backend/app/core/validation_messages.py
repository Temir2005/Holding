"""Russian messages for pydantic validation errors, for the admin API and preview.

Built from the error `type` and its `ctx` (limits, allowed values), not from pydantic's
English text. The public API keeps FastAPI's default messages.
"""

from collections.abc import Callable, Mapping
from typing import Any

Ctx = Mapping[str, Any]


def _min_length(ctx: Ctx) -> str:
    n = ctx.get("min_length")
    return "Заполните поле" if n == 1 else f"Не короче {n} символов"


def _allowed(ctx: Ctx) -> str:
    # pydantic lists choices as "'a', 'b' or 'c'".
    return "Допустимые значения: " + str(ctx.get("expected", "")).replace(" or ", ", ")


def _custom(ctx: Ctx) -> str:
    # Our validators raise ValueError with a message meant for people.
    error = ctx.get("error")
    text = str(error) if error is not None else ""
    return text[:1].upper() + text[1:] if text else "Неверное значение"


MESSAGES: dict[str, Callable[[Ctx], str]] = {
    "missing": lambda _: "Обязательное поле",
    "extra_forbidden": lambda _: "Лишнее поле",
    "string_type": lambda _: "Нужен текст",
    "string_too_short": _min_length,
    "string_too_long": lambda c: f"Не длиннее {c.get('max_length')} символов",
    "string_pattern_mismatch": lambda _: "Неверный формат",
    "int_type": lambda _: "Нужно целое число",
    "int_parsing": lambda _: "Нужно целое число",
    "int_from_float": lambda _: "Нужно целое число",
    "float_type": lambda _: "Нужно число",
    "float_parsing": lambda _: "Нужно число",
    "decimal_type": lambda _: "Нужно число",
    "decimal_parsing": lambda _: "Нужно число",
    "decimal_max_digits": lambda c: f"Не больше {c.get('max_digits')} цифр",
    "decimal_max_places": lambda c: f"Не больше {c.get('decimal_places')} знаков после запятой",
    "greater_than": lambda c: f"Должно быть больше {c.get('gt')}",
    "greater_than_equal": lambda c: f"Не меньше {c.get('ge')}",
    "less_than": lambda c: f"Должно быть меньше {c.get('lt')}",
    "less_than_equal": lambda c: f"Не больше {c.get('le')}",
    "multiple_of": lambda c: f"Должно делиться на {c.get('multiple_of')}",
    "bool_type": lambda _: "Нужно «да» или «нет»",
    "bool_parsing": lambda _: "Нужно «да» или «нет»",
    "literal_error": _allowed,
    "enum": _allowed,
    "uuid_type": lambda _: "Нужен идентификатор (UUID)",
    "uuid_parsing": lambda _: "Нужен идентификатор (UUID)",
    "list_type": lambda _: "Нужен список",
    "too_short": lambda c: f"Минимум элементов: {c.get('min_length')}",
    "too_long": lambda c: f"Максимум элементов: {c.get('max_length')}",
    "dict_type": lambda _: "Нужен объект",
    "model_type": lambda _: "Нужен объект",
    "model_attributes_type": lambda _: "Нужен объект",
    "url_type": lambda _: "Неверный адрес",
    "url_parsing": lambda _: "Неверный адрес",
    "url_scheme": lambda c: f"Адрес должен начинаться с {c.get('expected_schemes')}",
    "date_type": lambda _: "Неверная дата",
    "date_parsing": lambda _: "Неверная дата",
    "date_from_datetime_parsing": lambda _: "Неверная дата",
    "datetime_type": lambda _: "Неверные дата и время",
    "datetime_parsing": lambda _: "Неверные дата и время",
    "datetime_from_date_parsing": lambda _: "Неверные дата и время",
    "timezone_aware": lambda _: "Укажите часовой пояс",
    "json_invalid": lambda _: "Некорректный JSON",
    "json_type": lambda _: "Некорректный JSON",
    "union_tag_invalid": lambda c: f"Неизвестный тип; допустимые: {c.get('expected_tags')}",
    "union_tag_not_found": lambda _: "Не указан тип",
    "value_error": _custom,
    "assertion_error": _custom,
}


def ru_message(error: Mapping[str, Any]) -> str:
    """Russian text for one pydantic error (an item of `ValidationError.errors()`)."""
    build = MESSAGES.get(str(error.get("type", "")))
    if build is None:
        return "Неверное значение"
    ctx = error.get("ctx")
    return build(ctx if isinstance(ctx, Mapping) else {})
