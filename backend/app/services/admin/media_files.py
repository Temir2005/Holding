"""What an uploaded file really is.

Pure functions: bytes in, facts out. The service decides what to do with them.
- Raster images and SVG are read whole: Pillow / defusedxml.
- Video and PDF are recognized from their first bytes only (the caller reads a range).
"""

import io
import re
import struct
from dataclasses import dataclass, field
from enum import StrEnum
from xml.etree.ElementTree import Element, register_namespace, tostring

from defusedxml import DefusedXmlException
from defusedxml.ElementTree import ParseError, fromstring
from PIL import Image, ImageOps, UnidentifiedImageError

# Pillow refuses images above this many pixels (decompression bombs).
Image.MAX_IMAGE_PIXELS = 60_000_000


class MediaKind(StrEnum):
    image = "image"
    svg = "svg"
    video = "video"
    document = "document"


@dataclass(frozen=True)
class MediaType:
    mime: str
    ext: str
    kind: MediaKind
    # Pillow format name for raster images.
    pillow_format: str | None = None


MEDIA_TYPES: dict[str, MediaType] = {
    t.mime: t
    for t in (
        MediaType("image/jpeg", "jpg", MediaKind.image, "JPEG"),
        MediaType("image/png", "png", MediaKind.image, "PNG"),
        MediaType("image/webp", "webp", MediaKind.image, "WEBP"),
        MediaType("image/avif", "avif", MediaKind.image, "AVIF"),
        MediaType("image/svg+xml", "svg", MediaKind.svg),
        MediaType("video/mp4", "mp4", MediaKind.video),
        MediaType("application/pdf", "pdf", MediaKind.document),
    )
}
PILLOW_TO_MIME = {t.pillow_format: t.mime for t in MEDIA_TYPES.values() if t.pillow_format}

# How much of a video or PDF we read to recognize it.
HEAD_BYTES = 1024 * 1024


class ProbeError(ValueError):
    """The bytes are not what was declared, or not a supported file at all."""


@dataclass
class Probe:
    mime: str
    width: int = 0
    height: int = 0
    dominant_color: str | None = None
    # Replacement content (sanitized SVG); None means keep the uploaded bytes.
    cleaned: bytes | None = None
    warnings: list[str] = field(default_factory=list)


# --- raster images ---------------------------------------------------------------


def open_raster(data: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ProbeError("Файл не является поддерживаемым изображением") from exc
    return image


def probe_raster(data: bytes, declared: MediaType) -> Probe:
    image = open_raster(data)
    actual = PILLOW_TO_MIME.get(image.format or "")
    if actual is None:
        raise ProbeError(f"Формат {image.format} не поддерживается")
    if actual != declared.mime:
        raise ProbeError(f"Заявлен {declared.mime}, а файл на самом деле {actual}")
    upright = ImageOps.exif_transpose(image)
    return Probe(
        mime=actual,
        width=upright.width,
        height=upright.height,
        dominant_color=dominant_color(upright),
    )


def dominant_color(image: Image.Image) -> str:
    """Average color, used as the placeholder behind a loading image."""
    pixel = image.convert("RGB").resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    assert isinstance(pixel, tuple)
    r, g, b = pixel[:3]
    return f"#{r:02x}{g:02x}{b:02x}"


@dataclass(frozen=True)
class Variant:
    width: int
    height: int
    body: bytes


def make_variants(data: bytes, widths: list[int], quality: int = 80) -> list[Variant]:
    """WebP copies at each width narrower than the original; never upscales."""
    image = ImageOps.exif_transpose(open_raster(data))
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    variants: list[Variant] = []
    for width in sorted(set(widths)):
        if width >= image.width:
            break
        height = max(1, round(image.height * width / image.width))
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, "WEBP", quality=quality, method=4)
        variants.append(Variant(width, height, buf.getvalue()))
    return variants


# --- SVG -------------------------------------------------------------------------

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
register_namespace("", SVG_NS)
register_namespace("xlink", XLINK_NS)

# Drawing elements only. Anything else (script, foreignObject, iframe, animate with
# href tricks...) is removed together with its children.
SVG_ALLOWED = frozenset(
    {
        "svg", "g", "defs", "symbol", "use", "title", "desc", "metadata",
        "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
        "text", "tspan", "textPath",
        "linearGradient", "radialGradient", "stop", "pattern", "clipPath", "mask",
        "filter", "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix", "feFlood",
        "feComposite", "feMerge", "feMergeNode", "feDropShadow",
        "image", "style",
    }
)  # fmt: skip
HREF_ATTRS = ("href", f"{{{XLINK_NS}}}href")
UNSAFE_CSS = re.compile(r"@import|javascript:|expression\s*\(|url\(\s*['\"]?(?!#)", re.I)


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _clean(element: Element, removed: list[str]) -> None:
    for child in list(element):
        if not isinstance(child.tag, str) or _local(child.tag) not in SVG_ALLOWED:
            removed.append(_local(str(child.tag)))
            element.remove(child)
            continue
        _clean(child, removed)
    for name in list(element.attrib):
        value = element.attrib[name]
        local = _local(name).lower()
        if local.startswith("on"):
            removed.append(f"@{local}")
            del element.attrib[name]
        elif name in HREF_ATTRS and not (
            value.startswith("#")
            or (_local(element.tag) == "image" and value.startswith("data:image/"))
        ):
            # Only in-document references; external URLs could load anything.
            removed.append(f"@{local}")
            del element.attrib[name]
        elif "javascript:" in value.lower() or (local == "style" and UNSAFE_CSS.search(value)):
            removed.append(f"@{local}")
            del element.attrib[name]
    if _local(element.tag) == "style" and element.text and UNSAFE_CSS.search(element.text):
        removed.append("style")
        element.text = UNSAFE_CSS.sub("/* removed */", element.text)


def _length(value: str | None) -> float | None:
    if not value:
        return None
    match = re.fullmatch(r"\s*([\d.]+)\s*(px)?\s*", value)
    return float(match.group(1)) if match else None


def probe_svg(data: bytes) -> Probe:
    try:
        # defusedxml refuses DTDs, entities and external references (XML bombs, XXE).
        root = fromstring(data, forbid_dtd=True)
    except (ParseError, DefusedXmlException, ValueError) as exc:
        raise ProbeError(
            "SVG не удалось разобрать или он содержит запрещённые конструкции"
        ) from exc
    if _local(root.tag) != "svg":
        raise ProbeError("Файл не является SVG")

    removed: list[str] = []
    _clean(root, removed)

    width, height = _length(root.get("width")), _length(root.get("height"))
    if (width is None or height is None) and root.get("viewBox"):
        parts = re.split(r"[\s,]+", root.get("viewBox", "").strip())
        if len(parts) == 4:
            width, height = float(parts[2]), float(parts[3])
    probe = Probe(
        mime="image/svg+xml",
        width=round(width or 0),
        height=round(height or 0),
        cleaned=tostring(root, encoding="utf-8", xml_declaration=False),
    )
    if removed:
        probe.warnings.append(
            f"Из SVG удалены небезопасные части: {', '.join(sorted(set(removed)))}"
        )
    if not probe.width or not probe.height:
        probe.warnings.append("У SVG нет размеров (width/height или viewBox)")
    return probe


# --- MP4 -------------------------------------------------------------------------


def _boxes(data: bytes, start: int, end: int) -> list[tuple[bytes, int, int]]:
    """(type, payload_start, payload_end) of ISO-BMFF boxes in data[start:end]."""
    found = []
    pos = start
    while pos + 8 <= end:
        size, kind = struct.unpack(">I4s", data[pos : pos + 8])
        header = 8
        if size == 1 and pos + 16 <= end:
            size = struct.unpack(">Q", data[pos + 8 : pos + 16])[0]
            header = 16
        elif size == 0:
            size = end - pos
        if size < header:
            break
        found.append((kind, pos + header, min(pos + size, end)))
        pos += size
    return found


def _tkhd_size(data: bytes, start: int, end: int) -> tuple[int, int] | None:
    version = data[start]
    offset = start + (88 if version == 1 else 76)
    if offset + 8 > end:
        return None
    width, height = struct.unpack(">II", data[offset : offset + 8])
    return width >> 16, height >> 16  # 16.16 fixed point


def probe_mp4(head: bytes) -> Probe:
    if len(head) < 12 or head[4:8] != b"ftyp":
        raise ProbeError("Файл не является видео MP4")
    probe = Probe(mime="video/mp4")
    for kind, start, end in _boxes(head, 0, len(head)):
        if kind != b"moov":
            continue
        for trak_kind, t_start, t_end in _boxes(head, start, end):
            if trak_kind != b"trak":
                continue
            for k, s, e in _boxes(head, t_start, t_end):
                size = _tkhd_size(head, s, e) if k == b"tkhd" else None
                if size and size[0] and size[1]:
                    probe.width, probe.height = size
                    return probe
    probe.warnings.append(
        "Не удалось определить размер видео по началу файла (данные moov в конце). "
        "Перекодируйте с параметром faststart, чтобы видео начинало играть быстрее."
    )
    return probe


# --- PDF -------------------------------------------------------------------------


def probe_pdf(head: bytes) -> Probe:
    # The header may follow a few junk bytes, but must sit in the first kilobyte.
    if b"%PDF-" not in head[:1024]:
        raise ProbeError("Файл не является PDF")
    return Probe(mime="application/pdf")


def needs_full_read(kind: MediaKind) -> bool:
    return kind in (MediaKind.image, MediaKind.svg)
