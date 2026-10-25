"""`make demo-photos`: download free stock photos for the seed's image slots.

Local demo only. The photos land in `seed/photos/` (ignored by git and docker), where the
seeds take them instead of the drawn images (`make seed-force`); who took them and under
which license is written to `seed/photos/CREDITS.md`.

The API key comes from the environment (`.env`): PEXELS_API_KEY or UNSPLASH_ACCESS_KEY.
Only Pexels License and Unsplash License photos are used. For Unsplash, the download
endpoint of every photo taken is called, as its API guidelines require.

A slot that already has a file is left alone. `--replace <slot>` drops that slot's photo
and takes the next search result; a dropped photo is not offered again.
Never downloaded: the founder's portrait (a real person) and client logos (others' brands).
Panel swatches stay drawn: their labels name exact colors that a stock texture would not match.
"""

import argparse
import asyncio
import io
import json
import os
import sys
from collections.abc import Iterable
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import ClassVar, Literal, Protocol

import httpx
from PIL import Image, ImageOps

from seed.seeder import NO_OVERRIDE, PHOTOS_DIR

MAX_SIDE = 2400
QUALITY = 85
PER_PAGE = 30
MAX_PAGES = 3
SOURCES = "sources.json"
CREDITS = "CREDITS.md"

Orientation = Literal["landscape", "portrait"]


@dataclass(frozen=True)
class Slot:
    key: str
    queries: tuple[str, ...]  # tried in order until one gives a suitable photo
    orientation: Orientation = "landscape"
    min_width: int = 1600
    # Slots of one group get different photographers: a photo series shows one person.
    group: str | None = None


def _team(key: str) -> Slot:
    return Slot(key, ("business portrait neutral background",), "portrait", 900, group="team")


SLOTS: tuple[Slot, ...] = (
    Slot(
        "hero-holding",
        ("residential construction cranes sunset city", "new residential district cranes"),
        min_width=1920,
    ),
    Slot("dev-site", ("construction site cranes concrete frame",), min_width=1920),
    Slot("dev-land", ("empty land plot steppe survey",)),
    Slot("dev-handover", ("new apartment building evening",)),
    Slot("office-team", ("architects team meeting model",)),
    Slot("sp-production", ("panel painting line factory", "furniture factory production line")),
    Slot("sp-finishes", ("wood panel samples colors",)),
    Slot("sp-truck", ("warehouse truck loading panels", "truck loading warehouse")),
    Slot("history-workshop", ("woodworking workshop garage", "small carpentry workshop")),
    Slot("projects-alatau", ("new city district aerial mountains",), min_width=1920),
    Slot("birlik-1", ("residential quarter courtyard mountains",)),
    Slot("birlik-2", ("residential courtyard playground",)),
    Slot("birlik-3", ("residential district construction aerial",)),
    Slot("bc-office", ("business center facade",)),
    Slot("logistics", ("logistics warehouse loading docks",)),
    Slot("clients-hero", ("furniture workshop kitchen installation",)),
    Slot("aaag-sky", ("almaty mountains city morning",), min_width=1920),
    Slot("aaag-eco", ("mountain foothills city dusk",)),
    *(
        _team(f"person-{key}")
        for key in (
            "ceo",
            "cfo",
            "construction",
            "engineer",
            "architect",
            "production",
            "hr",
            "sales",
            "pm",
            "quality",
            "marketing",
        )
    ),
)
SLOT_BY_KEY = {slot.key: slot for slot in SLOTS}


class FetchError(Exception):
    """A problem the person running the script has to fix; the message says how."""


@dataclass(frozen=True)
class Candidate:
    id: str  # provider-prefixed, e.g. "pexels:123"
    width: int
    height: int
    image_url: str
    author: str
    author_url: str
    page_url: str
    download_location: str | None = None  # Unsplash: called when the photo is used


@dataclass
class Credit:
    id: str
    query: str
    author: str
    author_url: str
    page_url: str
    license: str
    license_url: str


@dataclass
class State:
    slots: dict[str, Credit] = field(default_factory=dict)
    rejected: dict[str, list[str]] = field(default_factory=dict)

    @classmethod
    def load(cls, path: Path) -> "State":
        if not path.is_file():
            return cls()
        raw = json.loads(path.read_text())
        return cls(
            slots={key: Credit(**credit) for key, credit in raw.get("slots", {}).items()},
            rejected={key: list(ids) for key, ids in raw.get("rejected", {}).items()},
        )

    def save(self, path: Path) -> None:
        data = {
            "slots": {key: asdict(credit) for key, credit in sorted(self.slots.items())},
            "rejected": self.rejected,
        }
        _write(path, json.dumps(data, ensure_ascii=False, indent=2).encode())


class Provider(Protocol):
    name: str
    license: str
    license_url: str

    async def search(self, query: str, orientation: Orientation, page: int) -> list[Candidate]: ...

    async def download(self, photo: Candidate) -> bytes: ...


def _check(response: httpx.Response, provider: str) -> None:
    if response.status_code in (401, 403):
        raise FetchError(f"{provider} не принял ключ API: проверьте его в .env.")
    if response.status_code == 429:
        raise FetchError(
            f"{provider}: исчерпан лимит запросов. Скачанное сохранено, "
            "повторите make demo-photos позже (обычно через час)."
        )
    response.raise_for_status()


def _long_side(width: int, height: int) -> str:
    return "h" if height > width else "w"


class Pexels:
    name = "Pexels"
    license = "Pexels License"
    license_url = "https://www.pexels.com/license/"
    api = "https://api.pexels.com/v1/search"

    def __init__(self, client: httpx.AsyncClient, key: str) -> None:
        self.client = client
        self.key = key

    async def search(self, query: str, orientation: Orientation, page: int) -> list[Candidate]:
        response = await self.client.get(
            self.api,
            params={"query": query, "orientation": orientation, "per_page": PER_PAGE, "page": page},
            headers={"Authorization": self.key},
        )
        _check(response, self.name)
        return [
            Candidate(
                id=f"pexels:{p['id']}",
                width=p["width"],
                height=p["height"],
                # Pexels resizes on its CDN, so the original (often 6000 px) is not pulled.
                image_url=str(
                    httpx.URL(p["src"]["original"]).copy_merge_params(
                        {"auto": "compress", "cs": "tinysrgb"}
                        | {_long_side(p["width"], p["height"]): str(MAX_SIDE)}
                    )
                ),
                author=p["photographer"],
                author_url=p["photographer_url"],
                page_url=p["url"],
            )
            for p in response.json().get("photos", [])
        ]

    async def download(self, photo: Candidate) -> bytes:
        # The image CDN needs no key, and the key is not sent there.
        response = await self.client.get(photo.image_url, follow_redirects=True)
        _check(response, self.name)
        return response.content


class Unsplash:
    name = "Unsplash"
    license = "Unsplash License"
    license_url = "https://unsplash.com/license"
    api = "https://api.unsplash.com/search/photos"
    # Unsplash asks for these on every link back to it.
    referral: ClassVar[dict[str, str]] = {"utm_source": "megasmart_demo", "utm_medium": "referral"}

    def __init__(self, client: httpx.AsyncClient, key: str) -> None:
        self.client = client
        self.headers = {"Authorization": f"Client-ID {key}", "Accept-Version": "v1"}

    def _link(self, url: str) -> str:
        return str(httpx.URL(url).copy_merge_params(self.referral))

    async def search(self, query: str, orientation: Orientation, page: int) -> list[Candidate]:
        response = await self.client.get(
            self.api,
            params={
                "query": query,
                "orientation": orientation,
                "per_page": PER_PAGE,
                "page": page,
                "content_filter": "high",
            },
            headers=self.headers,
        )
        _check(response, self.name)
        return [
            Candidate(
                id=f"unsplash:{p['id']}",
                width=p["width"],
                height=p["height"],
                image_url=str(
                    httpx.URL(p["urls"]["raw"]).copy_merge_params(
                        {"fm": "jpg", "q": str(QUALITY)}
                        | {_long_side(p["width"], p["height"]): str(MAX_SIDE)}
                    )
                ),
                author=p["user"]["name"],
                author_url=self._link(p["user"]["links"]["html"]),
                page_url=self._link(p["links"]["html"]),
                download_location=p["links"]["download_location"],
            )
            for p in response.json().get("results", [])
        ]

    async def download(self, photo: Candidate) -> bytes:
        if photo.download_location:
            # Required by the Unsplash API guidelines: counts the download for the author.
            _check(await self.client.get(photo.download_location, headers=self.headers), self.name)
        response = await self.client.get(photo.image_url, follow_redirects=True)
        _check(response, self.name)
        return response.content


def provider_from_env(client: httpx.AsyncClient) -> Provider:
    if key := os.environ.get("PEXELS_API_KEY", "").strip():
        return Pexels(client, key)
    if key := os.environ.get("UNSPLASH_ACCESS_KEY", "").strip():
        return Unsplash(client, key)
    raise FetchError(
        "Нет ключа API: добавьте в .env PEXELS_API_KEY=… (или UNSPLASH_ACCESS_KEY=…) "
        "и выполните make up, чтобы контейнер бэкенда его увидел."
    )


def _write(path: Path, body: bytes) -> None:
    """Write via a temporary file, so an interrupted run never leaves half an image."""
    tmp = path.with_name(f".{path.name}.part")
    tmp.write_bytes(body)
    tmp.replace(path)


def shrink(body: bytes) -> bytes:
    """Upright RGB JPEG, long side at most MAX_SIDE, without the camera metadata."""
    with Image.open(io.BytesIO(body)) as source:
        img = ImageOps.exif_transpose(source).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    img.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return out.getvalue()


@dataclass
class Report:
    downloaded: list[str] = field(default_factory=list)
    kept: list[str] = field(default_factory=list)
    not_found: list[str] = field(default_factory=list)


class Fetcher:
    def __init__(self, provider: Provider, photos_dir: Path) -> None:
        self.provider = provider
        self.dir = photos_dir
        photos_dir.mkdir(parents=True, exist_ok=True)
        self.state_path = photos_dir / SOURCES
        self.state = State.load(self.state_path)
        self.results: dict[tuple[str, Orientation, int], list[Candidate]] = {}

    def path(self, key: str) -> Path:
        return self.dir / f"{key}.jpg"

    def drop(self, keys: Iterable[str]) -> None:
        for key in keys:
            credit = self.state.slots.pop(key, None)
            if credit:
                self.state.rejected.setdefault(key, []).append(credit.id)
            self.path(key).unlink(missing_ok=True)
            self.state.save(self.state_path)

    async def results_for(self, query: str, orientation: Orientation, page: int) -> list[Candidate]:
        # Slots sharing a query (the team, the sites) share one search request.
        cache_key = (query, orientation, page)
        if cache_key not in self.results:
            self.results[cache_key] = await self.provider.search(query, orientation, page)
        return self.results[cache_key]

    async def pick(self, slot: Slot) -> tuple[Candidate, str] | None:
        used = {credit.id for credit in self.state.slots.values()}
        rejected = set(self.state.rejected.get(slot.key, []))
        group_authors = {
            credit.author_url
            for key, credit in self.state.slots.items()
            if slot.group and key in SLOT_BY_KEY and SLOT_BY_KEY[key].group == slot.group
        }
        for query in slot.queries:
            for page in range(1, MAX_PAGES + 1):
                found = await self.results_for(query, slot.orientation, page)
                for photo in found:
                    landscape = photo.width > photo.height
                    if (
                        photo.id in used
                        or photo.id in rejected
                        or photo.width < slot.min_width
                        or landscape != (slot.orientation == "landscape")
                        or photo.author_url in group_authors
                    ):
                        continue
                    return photo, query
                if len(found) < PER_PAGE:
                    break
        return None

    async def run(self) -> Report:
        report = Report()
        # A photo whose file was deleted by hand is no longer in use.
        self.state.slots = {k: c for k, c in self.state.slots.items() if self.path(k).is_file()}
        for slot in SLOTS:
            if self.path(slot.key).is_file():
                report.kept.append(slot.key)
                continue
            picked = await self.pick(slot)
            if picked is None:
                report.not_found.append(slot.key)
                continue
            photo, query = picked
            _write(self.path(slot.key), shrink(await self.provider.download(photo)))
            self.state.slots[slot.key] = Credit(
                id=photo.id,
                query=query,
                author=photo.author,
                author_url=photo.author_url,
                page_url=photo.page_url,
                license=self.provider.license,
                license_url=self.provider.license_url,
            )
            # Saved after every photo: a run stopped by the rate limit keeps what it got.
            self.state.save(self.state_path)
            report.downloaded.append(slot.key)
        self.write_credits(report.not_found)
        return report

    def write_credits(self, not_found: list[str]) -> None:
        lines = [
            "# Демо-фото — только для локального просмотра",
            "",
            "Скачаны командой `make demo-photos`. Папка `seed/photos/` не попадает в git и в "
            "Docker-образ. Сиды берут файл `<слот>.jpg` отсюда вместо нарисованной картинки "
            "(`make seed-force`).",
            "",
            "> **Перед публикацией сайта заменить портреты команды (`person-*`) на настоящие "
            "фото сотрудников.** Сотрудники в стартовом контенте вымышленные, стоковые лица "
            "допустимы только в демо.",
            ">",
            "> Не скачиваются: портрет основателя (`person-founder`, реальный человек), "
            "логотипы клиентов (чужие бренды) и образцы панелей (подписаны точными цветами).",
            "",
            "| Слот | Фото | Автор | Лицензия |",
            "|---|---|---|---|",
        ]
        for slot in SLOTS:
            credit = self.state.slots.get(slot.key)
            if credit:
                lines.append(
                    f"| `{slot.key}` | [{credit.id}]({credit.page_url}) "
                    f"| [{credit.author}]({credit.author_url}) "
                    f"| [{credit.license}]({credit.license_url}) |"
                )
            elif self.path(slot.key).is_file():
                lines.append(f"| `{slot.key}` | свой файл | — | проверить лицензию вручную |")
        if not_found:
            lines += ["", "Не нашлось подходящего фото: " + ", ".join(f"`{k}`" for k in not_found)]
        _write(self.dir / CREDITS, ("\n".join(lines) + "\n").encode())


def check_replace(keys: list[str]) -> None:
    for key in keys:
        if key in NO_OVERRIDE:
            raise FetchError(f"{key}: этот слот не заменяется стоковым фото (реальный человек).")
        if key not in SLOT_BY_KEY:
            raise FetchError(f"{key}: нет такого слота. Слоты: {', '.join(SLOT_BY_KEY)}.")


async def fetch_photos(provider: Provider, photos_dir: Path, replace: list[str]) -> Report:
    check_replace(replace)
    fetcher = Fetcher(provider, photos_dir)
    fetcher.drop(replace)
    return await fetcher.run()


async def main(replace: list[str]) -> int:
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            report = await fetch_photos(provider_from_env(client), PHOTOS_DIR, replace)
    except FetchError as error:
        print(error, file=sys.stderr)
        return 1
    print(
        f"Скачано: {len(report.downloaded)}, уже были: {len(report.kept)}, "
        f"не нашлось: {len(report.not_found)}."
    )
    if report.not_found:
        print("Без фото: " + ", ".join(report.not_found))
    print(f"Авторы и лицензии: backend/seed/photos/{CREDITS}")
    print("Применить: make seed-force (перезапишет стартовый контент в dev-базе).")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download demo stock photos for the seeds")
    parser.add_argument(
        "--replace",
        action="append",
        default=[],
        metavar="SLOT",
        help="Drop this slot's photo and take the next search result (repeatable)",
    )
    sys.exit(asyncio.run(main(parser.parse_args().replace)))
