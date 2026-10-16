"""Lists the admin UI shows instead of hard-coding them: roles, audit actions and entities,
and the site settings form."""

import re
from pathlib import Path

from httpx import AsyncClient

import app.services.admin as services
import seed
from app.models import AdminUser, UserRole
from app.schemas.admin.settings import SettingsForm, SettingsUpdate
from app.services.admin.base import CrudService
from app.services.admin.meta import AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS
from app.services.admin.publishing import ENTITY as PUBLISHING_ENTITY
from tests.conftest import auth_header

ADMIN = "/api/v1/admin"
SERVICES = Path(services.__file__).parent
SEED = Path(seed.__file__).parent


def audit_calls() -> list[str]:
    """Source of every `.record(...)` call of the admin services and the seeds."""
    calls: list[str] = []
    for path in [*SERVICES.glob("*.py"), *SEED.glob("*.py")]:
        calls += re.findall(r"\.record\((.*?)\)\n", path.read_text(), flags=re.S)
    return calls


def subclasses(cls: type) -> set[type]:
    found: set[type] = set(cls.__subclasses__())
    for sub in list(found):
        found |= subclasses(sub)
    return found


def test_every_audit_action_has_a_label() -> None:
    calls = audit_calls()
    assert len(calls) >= 10
    actions = {a for call in calls for a in re.findall(r'action="([a-z_]+)"', call)}
    assert actions, calls
    assert actions <= set(AUDIT_ACTION_LABELS)


def test_every_audited_entity_has_a_label() -> None:
    # Import every service so CrudService knows all its subclasses.
    for path in SERVICES.glob("*.py"):
        __import__(f"app.services.admin.{path.stem}")
    # Services only: other tests define their own subclasses.
    entities = {
        getattr(cls, "entity_type", None)
        for cls in subclasses(CrudService)
        if cls.__module__.startswith("app.services.")
    } - {None}
    literal = {e for call in audit_calls() for e in re.findall(r'entity_type="([a-z_]+)"', call)}
    assert "project" in entities
    assert entities | literal | {PUBLISHING_ENTITY} <= set(AUDIT_ENTITY_LABELS)


def test_settings_form_matches_what_put_accepts() -> None:
    assert set(SettingsForm.model_fields) == set(SettingsUpdate.model_fields) - {"version"}


async def test_meta_and_entity_types_carry_the_lists(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    meta = (await client.get(f"{ADMIN}/meta", headers=h)).json()
    assert meta["user_roles"] == [
        {"value": UserRole.admin.value, "label": "Администратор"},
        {"value": UserRole.editor.value, "label": "Редактор"},
    ]
    assert {"value": "publish", "label": "Публикация"} in meta["audit_actions"]
    assert {"value": "site_settings", "label": "Настройки сайта"} in meta["audit_entity_types"]

    types = {t["type"]: t for t in (await client.get(f"{ADMIN}/entity-types", headers=h)).json()}
    settings = types["site_settings"]
    assert settings["label"] == "Настройки сайта"
    props = settings["schema"]["properties"]
    assert props["logo_id"]["x-ref"]["accept"] == ["image", "svg"]
    nav = settings["schema"]["$defs"]["NavItem"]["properties"]
    assert nav["page_slug"]["x-widget"] == "page"
