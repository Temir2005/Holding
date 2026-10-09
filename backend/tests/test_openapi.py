"""Operation ids name the generated client types, so they must be unique and stable."""

from collections import Counter

from app.main import app

# The site's generated types (frontend/src/api/schema.d.ts) refer to these names.
PUBLIC_OPERATIONS = {
    "health",
    "get_settings",
    "get_page",
    "list_projects",
    "get_project",
    "list_people",
    "list_clients",
    "list_vacancies",
    "create_lead",
    "preview_page",
}


def operations() -> list[tuple[str, str]]:
    schema = app.openapi()
    return [
        (op["operationId"], path)
        for path, methods in schema["paths"].items()
        for op in methods.values()
    ]


def test_operation_ids_are_unique() -> None:
    counts = Counter(op_id for op_id, _ in operations())
    assert {op_id: n for op_id, n in counts.items() if n > 1} == {}


def test_public_operation_ids_do_not_change() -> None:
    public = {op_id for op_id, path in operations() if not path.startswith("/api/v1/admin")}
    assert public == PUBLIC_OPERATIONS


def test_admin_operation_ids_name_their_area() -> None:
    admin = {op_id for op_id, path in operations() if path.startswith("/api/v1/admin")}
    assert {
        "admin_projects_list_items",
        "admin_pages_get_page",
        "admin_settings_get_settings",
    } <= admin
    assert all(op_id.startswith("admin_") for op_id in admin)
