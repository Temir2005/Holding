from app.core.i18n import Locale, LocalizedText, resolve_text


def test_resolves_requested_locale() -> None:
    assert resolve_text({"ru": "Привет", "kk": "Сәлем"}, Locale.kk) == "Сәлем"


def test_falls_back_to_russian_when_missing_or_empty() -> None:
    assert resolve_text({"ru": "Привет"}, Locale.en) == "Привет"
    assert resolve_text({"ru": "Привет", "en": ""}, Locale.en) == "Привет"


def test_empty_value_resolves_to_none() -> None:
    assert resolve_text(None, Locale.ru) is None
    assert resolve_text({}, Locale.ru) is None


def test_localized_text_model() -> None:
    assert LocalizedText(ru="Да", en="Yes").resolve(Locale.en) == "Yes"
