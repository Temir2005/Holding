import uuid

import pytest
from pydantic import ValidationError

from app.core.i18n import Locale
from app.schemas.refs import RefKind, collect_refs, expand
from app.schemas.sections import SECTION_SCHEMAS, HeroData, ProcessStepsData, SectionType


def test_every_section_type_has_a_schema() -> None:
    assert set(SECTION_SCHEMAS) == set(SectionType)


def test_unknown_fields_are_rejected() -> None:
    with pytest.raises(ValidationError):
        HeroData.model_validate({"title": {"ru": "x"}, "unexpected": 1})


def test_localized_text_requires_russian() -> None:
    with pytest.raises(ValidationError):
        HeroData.model_validate({"title": {"en": "only english"}})


def test_refs_are_collected_from_nested_items() -> None:
    media_id, division_id = uuid.uuid4(), uuid.uuid4()
    data = ProcessStepsData.model_validate(
        {
            "steps": [
                {"title": {"ru": "a"}, "text": {"ru": "b"}, "media_id": str(media_id)},
                {"title": {"ru": "c"}, "text": {"ru": "d"}, "division_id": str(division_id)},
            ]
        }
    )
    refs = collect_refs(data)
    assert refs[RefKind.media] == {media_id}
    assert refs[RefKind.division] == {division_id}


def test_expand_resolves_text_and_drops_missing_refs() -> None:
    data = HeroData.model_validate(
        {
            "title": {"ru": "Заголовок", "en": "Title"},
            "background_media_id": str(uuid.uuid4()),  # not loaded → None
        }
    )
    out = expand(data, Locale.en, {})
    assert out["title"] == "Title"
    assert out["background"] is None
    assert "background_media_id" not in out
