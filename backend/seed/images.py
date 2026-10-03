"""Procedural placeholder images in the site palette.

Real photos are not available yet, so the seed draws neutral scenes (skyline,
construction site, panel production, panel swatches, portraits) and SVG logos.
Every image is deterministic for a given name, so re-seeding produces identical files.
"""

import io
import random
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFilter

GRAPHITE = (29, 30, 31)
PANEL = (38, 40, 42)
COPPER = (199, 123, 78)
STONE = (231, 226, 217)


@dataclass
class Rendered:
    body: bytes
    mime_type: str
    width: int
    height: int
    dominant_color: str


def _hex(rgb: tuple[int, ...]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def _mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        round(a[0] + (b[0] - a[0]) * t),
        round(a[1] + (b[1] - a[1]) * t),
        round(a[2] + (b[2] - a[2]) * t),
    )


def _gradient(img: Image.Image, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for y in range(h):
        draw.line([(0, y), (w, y)], fill=_mix(top, bottom, y / h))


def _finish(img: Image.Image, quality: int = 82) -> Rendered:
    img = img.convert("RGB")
    dominant = img.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    assert isinstance(dominant, tuple)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    return Rendered(buf.getvalue(), "image/jpeg", img.width, img.height, _hex(dominant[:3]))


def _windows(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    rng: random.Random,
    lit: tuple[int, int, int],
    dark: tuple[int, int, int],
) -> None:
    x0, y0, x1, y1 = box
    cols = max(2, (x1 - x0) // 26)
    rows = max(3, (y1 - y0) // 30)
    cw, rh = (x1 - x0) / cols, (y1 - y0) / rows
    for r in range(rows):
        for c in range(cols):
            fill = lit if rng.random() < 0.28 else dark
            wx, wy = x0 + c * cw + cw * 0.22, y0 + r * rh + rh * 0.25
            draw.rectangle([wx, wy, wx + cw * 0.56, wy + rh * 0.5], fill=fill)


def skyline(seed: str, w: int = 1920, h: int = 1080, dusk: bool = True) -> Rendered:
    """Towers against a dusk sky: hero backgrounds and project renders."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h))
    top = (24, 26, 30) if dusk else (120, 132, 140)
    bottom = (92, 64, 48) if dusk else (214, 206, 192)
    _gradient(img, top, bottom)
    draw = ImageDraw.Draw(img)
    ground = int(h * 0.86)
    x = int(w * rng.uniform(0.25, 0.4))
    while x < w:
        bw = rng.randint(int(w * 0.05), int(w * 0.11))
        bh = rng.randint(int(h * 0.25), int(h * 0.72))
        shade = _mix(GRAPHITE, PANEL, rng.random())
        draw.rectangle([x, ground - bh, x + bw, ground], fill=shade)
        _windows(
            draw, (x + 6, ground - bh + 12, x + bw - 6, ground - 10), rng, COPPER, (34, 36, 38)
        )
        x += bw + rng.randint(4, 18)
    draw.rectangle([0, ground, w, h], fill=(20, 21, 22))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    return _finish(img)


def construction(seed: str, w: int = 1600, h: int = 1000) -> Rendered:
    """Concrete frame under construction with a tower crane."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h))
    _gradient(img, (150, 158, 160), (226, 219, 206))
    draw = ImageDraw.Draw(img)
    ground = int(h * 0.82)
    fx0, floors = int(w * rng.uniform(0.18, 0.32)), rng.randint(7, 11)
    fw, fh = int(w * 0.42), int(h * 0.06)
    for f in range(floors):
        y = ground - (f + 1) * fh
        draw.rectangle([fx0, y, fx0 + fw, y + 8], fill=(98, 100, 102))
        for c in range(7):
            cx = fx0 + c * fw // 6
            draw.rectangle([cx - 4, y, cx + 4, y + fh], fill=(118, 120, 122))
    cx = fx0 + fw + int(w * 0.08)
    top = int(h * 0.1)
    draw.rectangle([cx - 10, top, cx + 10, ground], fill=COPPER)
    draw.rectangle([cx - int(w * 0.38), top, cx + int(w * 0.12), top + 16], fill=COPPER)
    draw.line([cx, top - 50, cx - int(w * 0.3), top], fill=COPPER, width=4)
    hook_x = cx - int(w * rng.uniform(0.15, 0.3))
    draw.line([hook_x, top + 16, hook_x, top + int(h * 0.3)], fill=(60, 60, 60), width=2)
    draw.rectangle([0, ground, w, h], fill=(170, 160, 146))
    return _finish(img.filter(ImageFilter.GaussianBlur(0.5)))


def production(seed: str, w: int = 1600, h: int = 1000) -> Rendered:
    """Factory floor with stacks of panel sheets under ceiling lights."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h))
    _gradient(img, (24, 25, 27), (58, 56, 54))
    draw = ImageDraw.Draw(img)
    vx, vy = w // 2, int(h * 0.42)
    for i in range(-8, 9):
        draw.line([vx, vy, vx + i * w // 6, h], fill=(48, 48, 48), width=2)
    for i in range(6):
        lx = int(w * (0.1 + i * 0.16))
        draw.rectangle([lx, 40, lx + 120, 52], fill=(236, 226, 208))
    palette = [(59, 63, 66), (199, 123, 78), (217, 208, 193), (241, 238, 232), (86, 98, 79)]
    for i in range(7):
        sx = int(w * 0.04) + i * int(w * 0.135)
        sheets = rng.randint(10, 22)
        color = palette[i % len(palette)]
        base = int(h * 0.9)
        for s in range(sheets):
            y = base - s * 9
            draw.rectangle(
                [sx, y - 7, sx + int(w * 0.11), y], fill=_mix(color, (0, 0, 0), (s % 2) * 0.12)
            )
    return _finish(img.filter(ImageFilter.GaussianBlur(0.4)))


def swatch(seed: str, color: str, finish: str, w: int = 1200, h: int = 900) -> Rendered:
    """A panel sample: matte, gloss (diagonal highlight) or texture (wood grain)."""
    rng = random.Random(seed)
    rgb = tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))
    base = (rgb[0], rgb[1], rgb[2])
    img = Image.new("RGB", (w, h), base)
    draw = ImageDraw.Draw(img)
    if finish == "texture":
        for y in range(0, h, 3):
            wobble = rng.uniform(-0.08, 0.08)
            draw.line(
                [(0, y), (w, y + int(w * wobble))], fill=_mix(base, (0, 0, 0), rng.uniform(0, 0.1))
            )
        img = img.filter(ImageFilter.GaussianBlur(1.2))
    elif finish == "gloss":
        overlay = Image.new("L", (w, h), 0)
        od = ImageDraw.Draw(overlay)
        od.polygon([(0, 0), (int(w * 0.55), 0), (0, int(h * 0.8))], fill=70)
        overlay = overlay.filter(ImageFilter.GaussianBlur(80))
        img = Image.composite(Image.new("RGB", (w, h), (255, 255, 255)), img, overlay)
    else:
        noise = Image.effect_noise((w, h), 6).convert("RGB")
        img = Image.blend(img, noise, 0.04)
    return _finish(img)


def portrait(seed: str, w: int = 900, h: int = 1100) -> Rendered:
    """Neutral silhouette, clearly a placeholder and never a fake face."""
    rng = random.Random(seed)
    bg = rng.choice([(58, 60, 62), (74, 70, 66), (66, 72, 68), (80, 74, 70)])
    img = Image.new("RGB", (w, h))
    _gradient(img, _mix(bg, (255, 255, 255), 0.1), bg)
    draw = ImageDraw.Draw(img)
    fg = _mix(bg, (210, 204, 196), 0.45)
    cx = w // 2
    r = int(w * 0.17)
    head_y = int(h * 0.36)
    draw.ellipse([cx - r, head_y - r, cx + r, head_y + r], fill=fg)
    draw.rounded_rectangle(
        [cx - int(w * 0.36), int(h * 0.6), cx + int(w * 0.36), h + 200],
        radius=int(w * 0.2),
        fill=fg,
    )
    return _finish(img)


def office(seed: str, w: int = 1600, h: int = 1000) -> Rendered:
    """Light office interior: long table, windows."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h))
    _gradient(img, (226, 221, 212), (196, 188, 176))
    draw = ImageDraw.Draw(img)
    for i in range(5):
        x = int(w * 0.08) + i * int(w * 0.18)
        draw.rectangle([x, int(h * 0.12), x + int(w * 0.14), int(h * 0.55)], fill=(238, 236, 230))
        draw.rectangle(
            [x, int(h * 0.12), x + int(w * 0.14), int(h * 0.55)], outline=(150, 144, 136), width=6
        )
    draw.polygon(
        [(int(w * 0.15), int(h * 0.72)), (int(w * 0.85), int(h * 0.72)), (w, h), (0, h)],
        fill=(88, 72, 58),
    )
    for i in range(rng.randint(5, 8)):
        x = int(w * 0.2) + i * int(w * 0.09)
        draw.rectangle([x, int(h * 0.62), x + 50, int(h * 0.72)], fill=GRAPHITE)
    return _finish(img.filter(ImageFilter.GaussianBlur(0.8)))


def logo_svg(name: str, seed: str) -> Rendered:
    """Simple monochrome-friendly logo: a geometric mark and the company name."""
    rng = random.Random(seed)
    color = rng.choice(["#C77B4E", "#56624F", "#3B3F42", "#8A6A4F", "#4F5F6E"])
    shape = rng.choice(["circle", "square", "triangle", "diamond"])
    marks = {
        "circle": f'<circle cx="28" cy="32" r="18" fill="{color}"/>',
        "square": f'<rect x="10" y="14" width="36" height="36" rx="4" fill="{color}"/>',
        "triangle": f'<path d="M28 12 48 50H8z" fill="{color}"/>',
        "diamond": f'<path d="M28 10 50 32 28 54 6 32z" fill="{color}"/>',
    }
    w, h = 280, 64
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        f"{marks[shape]}"
        f'<text x="62" y="40" font-family="Manrope, Arial, sans-serif" font-size="20" '
        f'font-weight="700" fill="{color}">{name}</text></svg>'
    )
    return Rendered(svg.encode(), "image/svg+xml", w, h, color)
