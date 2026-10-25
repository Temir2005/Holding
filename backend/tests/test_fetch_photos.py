"""`make demo-photos` against a fake Pexels: no network, no real key."""

import io
from pathlib import Path

import httpx
import pytest
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.storage.memory import InMemoryStorage
from seed import fetch_photos as fp
from seed.run import run_seed

KEY = "test-key"
TEAM_QUERY = "business portrait neutral background"


def jpeg(width: int, height: int) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (width, height), (90, 120, 150)).save(out, "JPEG")
    return out.getvalue()


class FakePexels:
    """A full page for every query. Photos 2k and 2k+1 share a photographer; photo 2 is small."""

    def __init__(self, status: int = 200) -> None:
        self.status = status
        self.searches: list[str] = []
        self.images: list[str] = []
        self.ids: dict[tuple[str, str, str, int], int] = {}
        self.body = jpeg(3000, 2000)

    def handler(self, request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.pexels.com":
            assert request.headers["Authorization"] == KEY
            if self.status != 200:
                return httpx.Response(self.status)
            params = request.url.params
            query, orientation, page = params["query"], params["orientation"], params["page"]
            self.searches.append(query)
            w, h = (3000, 2000) if orientation == "landscape" else (2000, 3000)
            photos = []
            for i in range(fp.PER_PAGE):
                n = self.ids.setdefault((query, orientation, page, i), len(self.ids) + 1)
                photos.append(
                    {
                        "id": n,
                        "width": 800 if i == 2 else w,
                        "height": h,
                        "url": f"https://www.pexels.com/photo/{n}/",
                        "photographer": f"Author {n}",
                        "photographer_url": f"https://www.pexels.com/@{query}-{page}-{i // 2}",
                        "src": {"original": f"https://images.pexels.com/photos/{n}/p.jpeg"},
                    }
                )
            return httpx.Response(200, json={"photos": photos})
        # The key goes to the API only, never to the image CDN.
        assert request.url.host == "images.pexels.com"
        assert "Authorization" not in request.headers
        self.images.append(str(request.url))
        return httpx.Response(200, content=self.body)

    def provider(self) -> fp.Pexels:
        return fp.Pexels(httpx.AsyncClient(transport=httpx.MockTransport(self.handler)), KEY)


async def test_downloads_every_slot_once_and_credits_it(tmp_path: Path) -> None:
    fake = FakePexels()
    report = await fp.fetch_photos(fake.provider(), tmp_path, [])

    assert report.downloaded == [slot.key for slot in fp.SLOTS]
    assert report.not_found == []
    for never in ("person-founder", "client-0", "swatch-ral-7016"):
        assert not (tmp_path / f"{never}.jpg").exists()
    with Image.open(tmp_path / "hero-holding.jpg") as photo:
        assert photo.format == "JPEG" and photo.size == (2400, 1600)
    assert all("=2400" in url for url in fake.images), "resized on the CDN"

    state = fp.State.load(tmp_path / fp.SOURCES)
    ids = [credit.id for credit in state.slots.values()]
    assert len(ids) == len(set(ids)), "no photo is used twice"
    team = [credit for key, credit in state.slots.items() if key.startswith("person-")]
    assert len({credit.author_url for credit in team}) == len(team) == 11
    assert fake.searches.count(TEAM_QUERY) == 1, "the team shares one search"

    credits = (tmp_path / fp.CREDITS).read_text()
    assert "Перед публикацией сайта заменить портреты команды" in credits
    assert "| `office-team` | [pexels:" in credits and "Pexels License" in credits
    assert "person-founder" in credits and "| `person-founder` |" not in credits

    # The next run keeps everything and makes no requests.
    fake.searches.clear()
    fake.images.clear()
    again = await fp.fetch_photos(fake.provider(), tmp_path, [])
    assert again.downloaded == [] and len(again.kept) == len(fp.SLOTS)
    assert fake.searches == [] and fake.images == []


async def test_replace_takes_the_next_result(tmp_path: Path) -> None:
    fake = FakePexels()
    await fp.fetch_photos(fake.provider(), tmp_path, [])
    first = fp.State.load(tmp_path / fp.SOURCES).slots["office-team"].id
    untouched = (tmp_path / "dev-land.jpg").stat().st_mtime_ns
    fake.images.clear()

    await fp.fetch_photos(fake.provider(), tmp_path, ["office-team"])
    state = fp.State.load(tmp_path / fp.SOURCES)
    second = state.slots["office-team"].id
    assert second != first and state.rejected["office-team"] == [first]
    assert len(fake.images) == 1
    assert (tmp_path / "dev-land.jpg").stat().st_mtime_ns == untouched

    await fp.fetch_photos(fake.provider(), tmp_path, ["office-team"])
    third = fp.State.load(tmp_path / fp.SOURCES).slots["office-team"].id
    assert third not in (first, second)


@pytest.mark.parametrize("slot", ["person-founder", "client-0", "no-such-slot"])
async def test_replace_refuses_slots_it_does_not_fill(tmp_path: Path, slot: str) -> None:
    with pytest.raises(fp.FetchError, match=slot):
        await fp.fetch_photos(FakePexels().provider(), tmp_path, [slot])


async def test_tells_what_to_fix(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PEXELS_API_KEY", raising=False)
    monkeypatch.delenv("UNSPLASH_ACCESS_KEY", raising=False)
    async with httpx.AsyncClient() as client:
        with pytest.raises(fp.FetchError, match="PEXELS_API_KEY"):
            fp.provider_from_env(client)
    with pytest.raises(fp.FetchError, match="ключ"):
        await fp.fetch_photos(FakePexels(status=401).provider(), tmp_path, [])
    with pytest.raises(fp.FetchError, match="лимит"):
        await fp.fetch_photos(FakePexels(status=429).provider(), tmp_path, [])


async def test_every_slot_is_an_image_the_seeds_upload(
    session: AsyncSession, storage: InMemoryStorage
) -> None:
    await run_seed(session, storage, get_settings())
    seeded = {key.removeprefix("seed/").rsplit(".", 1)[0] for key in storage.objects}
    assert {slot.key for slot in fp.SLOTS} <= seeded
