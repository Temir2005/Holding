"""Leads in the admin: list with filters, status and note, CSV export; and the contact form."""

import csv
import io
from datetime import UTC, datetime, timedelta
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Lead, LeadStatus
from tests.conftest import auth_header
from tests.test_pages_admin import PAGES, make_page

LEADS = "/api/v1/admin/leads"


async def add_leads(session: AsyncSession) -> list[Lead]:
    now = datetime.now(UTC)
    leads = [
        Lead(name="Айгерим", phone="+7 701 000 00 01", type="investor", created_at=now),
        Lead(
            name="Бекзат",
            email="b@example.kz",
            message='=HYPERLINK("http://evil")',
            type="partner",
            created_at=now - timedelta(days=10),
        ),
        Lead(name="Спамер", email="s@spam.io", type="client", status=LeadStatus.spam),
    ]
    session.add_all(leads)
    await session.commit()
    return leads


async def test_list_filter_and_search(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    await add_leads(session)
    h = auth_header(editor)

    everything = (await client.get(LEADS, headers=h)).json()
    assert everything["total"] == 3
    assert {lead["status"] for lead in everything["items"]} == {"new", "spam"}
    assert "ip_hash" not in everything["items"][0]
    dates = [lead["created_at"] for lead in everything["items"]]
    assert dates == sorted(dates, reverse=True)  # newest first

    def names(res: Any) -> set[str]:
        return {lead["name"] for lead in res.json()["items"]}

    assert names(await client.get(LEADS, headers=h, params={"type": "partner"})) == {"Бекзат"}
    assert names(await client.get(LEADS, headers=h, params={"status": "spam"})) == {"Спамер"}
    assert names(await client.get(LEADS, headers=h, params={"q": "example.kz"})) == {"Бекзат"}
    week_ago = (datetime.now(UTC) - timedelta(days=7)).isoformat()
    recent = await client.get(LEADS, headers=h, params={"created_from": week_ago})
    assert names(recent) == {"Айгерим", "Спамер"}
    older = await client.get(LEADS, headers=h, params={"created_to": week_ago})
    assert names(older) == {"Бекзат"}
    # A date without a time zone is ambiguous: refused instead of guessed.
    naive = await client.get(LEADS, headers=h, params={"created_from": "2026-10-01T00:00:00"})
    assert naive.status_code == 422


async def test_status_and_note(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    lead_id = str((await add_leads(session))[0].id)
    h = auth_header(editor)

    res = await client.patch(
        f"{LEADS}/{lead_id}", headers=h,
        json={"version": 1, "status": "in_progress", "manager_note": "  Перезвонить в среду  "},
    )  # fmt: skip
    assert res.status_code == 200, res.text
    assert (res.json()["status"], res.json()["manager_note"]) == (
        "in_progress",
        "Перезвонить в среду",
    )
    assert res.json()["version"] == 2

    cleared_status = {"version": 2, "status": None}
    assert (
        await client.patch(f"{LEADS}/{lead_id}", headers=h, json=cleared_status)
    ).status_code == 422
    bad = await client.patch(f"{LEADS}/{lead_id}", headers=h, json={"version": 2, "status": "lost"})
    assert bad.status_code == 422
    stale = await client.patch(
        f"{LEADS}/{lead_id}", headers=h, json={"version": 1, "status": "done"}
    )
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"

    cleared = await client.patch(
        f"{LEADS}/{lead_id}", headers=h, json={"version": 2, "manager_note": ""}
    )
    assert cleared.json()["manager_note"] is None
    assert (await client.get(f"{LEADS}/{lead_id}", headers=h)).json()["version"] == 3


async def test_csv_export(client: AsyncClient, editor: AdminUser, session: AsyncSession) -> None:
    await add_leads(session)
    h = auth_header(editor)

    res = await client.get(f"{LEADS}/export", headers=h, params={"status": "new"})
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert res.headers["content-disposition"].startswith('attachment; filename="leads-')
    text = res.content.decode("utf-8")
    assert text.startswith("﻿")
    rows = list(csv.reader(io.StringIO(text.lstrip("﻿")), delimiter=";"))
    assert rows[0][:3] == ["Дата", "Тема", "Статус"]
    by_name = {r[3]: r for r in rows[1:]}
    assert set(by_name) == {"Айгерим", "Бекзат"}
    assert by_name["Айгерим"][1:3] == ["Инвестиции", "Новая"]
    assert by_name["Айгерим"][4] == "+7 701 000 00 01"  # phones are left as they are
    assert by_name["Бекзат"][6].startswith("'=")  # a formula is turned into text

    log = await client.get("/api/v1/admin/audit-log", headers=auth_header(editor))
    assert log.status_code == 403  # the log itself is for admins; the export is still recorded


async def test_leads_need_a_token(client: AsyncClient) -> None:
    assert (await client.get(LEADS)).status_code == 401
    assert (await client.get(f"{LEADS}/export")).status_code == 401


async def test_public_form_still_creates_new_leads(client: AsyncClient, editor: AdminUser) -> None:
    res = await client.post(
        "/api/v1/leads", json={"name": "Иван", "phone": "+7 700 000 00 00", "type": "client"}
    )
    assert res.status_code in (200, 201), res.text
    listed = (await client.get(LEADS, headers=auth_header(editor))).json()["items"]
    assert [(lead["name"], lead["status"]) for lead in listed] == [("Иван", "new")]


async def test_contact_form_texts_and_topics_are_editable(
    client: AsyncClient, editor: AdminUser
) -> None:
    """Everything the form shows that is content lives in the contact_form block."""
    h = auth_header(editor)
    page = await make_page(client, h, "contacts")
    data = {
        "eyebrow": {"ru": "Связь"},
        "title": {"ru": "Напишите нам", "en": "Write to us"},
        "text": {"ru": "Ответим в течение дня"},
        "lead_types": ["client", "partner"],
        "default_type": "client",
        "consent_text": {"ru": "Согласен на обработку данных"},
        "success_text": {"ru": "Спасибо! Мы скоро ответим"},
    }
    res = await client.post(
        f"{PAGES}/{page['id']}/sections", headers=h, json={"type": "contact_form", "data": data}
    )
    assert res.status_code == 201, res.text
    section = res.json()

    cases: list[tuple[dict[str, Any], str]] = [
        ({"lead_types": []}, "lead_types"),
        ({"lead_types": ["client", "client"]}, "lead_types"),
        ({"default_type": "investor"}, "default_type"),
        ({"consent_text": {"ru": ""}}, "consent_text"),
    ]
    for bad, loc in cases:
        res = await client.patch(
            f"/api/v1/admin/sections/{section['id']}", headers=h,
            json={"version": section["version"], "data": {**data, **bad}},
        )  # fmt: skip
        assert res.status_code == 422, bad
        assert any(e["loc"][:3] == ["body", "data", loc] for e in res.json()["error"]["details"])
