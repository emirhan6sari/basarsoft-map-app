#!/usr/bin/env python3
"""BAŞARSOFT yazısı şeklinde 10.000 nokta koordinatı üretir → seed_basartext_points.sql"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

COUNT = 10_000
TEXT = "BAŞARSOFT"
PREFIX = "BASAR"

# Türkiye extent (useOpenLayersMap TURKEY_EXTENT_4326 ile uyumlu) — zoom ~7’de tüm yazı görünür
TURKEY_MIN_LON, TURKEY_MIN_LAT = 25.5, 35.8
TURKEY_MAX_LON, TURKEY_MAX_LAT = 44.8, 42.2
GEO_PAD = 0.04  # kenarlardan %4 boşluk

CENTER_LON = (TURKEY_MIN_LON + TURKEY_MAX_LON) / 2
CENTER_LAT = (TURKEY_MIN_LAT + TURKEY_MAX_LAT) / 2
SPAN_LON = (TURKEY_MAX_LON - TURKEY_MIN_LON) * (1 - GEO_PAD)
SPAN_LAT = (TURKEY_MAX_LAT - TURKEY_MIN_LAT) * (1 - GEO_PAD)

OUT_SQL = Path(__file__).resolve().parent / "seed_basartext_points.sql"


def find_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.is_file():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def rasterize_text() -> tuple[list[tuple[int, int]], int, int]:
    font_size = 140
    font = find_font(font_size)
    pad = 24

    probe = Image.new("L", (1, 1), 0)
    draw = ImageDraw.Draw(probe)
    bbox = draw.textbbox((0, 0), TEXT, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    w, h = tw + pad * 2, th + pad * 2
    img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(img)
    draw.text((pad - bbox[0], pad - bbox[1]), TEXT, fill=255, font=font)

    pixels = [(x, y) for y in range(h) for x in range(w) if img.getpixel((x, y)) > 96]
    return pixels, w, h


def sample_points(pixels: list[tuple[int, int]], count: int) -> list[tuple[int, int]]:
    if not pixels:
        raise RuntimeError("Metin pikseli üretilemedi — font kontrol edin.")

    rng = random.Random(42)
    if len(pixels) >= count:
        return rng.sample(pixels, count)

    out: list[tuple[int, int]] = []
    while len(out) < count:
        x, y = rng.choice(pixels)
        jx = rng.uniform(-0.35, 0.35)
        jy = rng.uniform(-0.35, 0.35)
        out.append((x + jx, y + jy))
    return out


def to_lon_lat(
    points: list[tuple[float, float]], width: int, height: int
) -> list[tuple[float, float]]:
    min_lon = CENTER_LON - SPAN_LON / 2
    max_lon = CENTER_LON + SPAN_LON / 2
    min_lat = CENTER_LAT - SPAN_LAT / 2
    max_lat = CENTER_LAT + SPAN_LAT / 2

    geo: list[tuple[float, float]] = []
    for x, y in points:
        lon = min_lon + (x / max(width - 1, 1)) * (max_lon - min_lon)
        lat = max_lat - (y / max(height - 1, 1)) * (max_lat - min_lat)
        geo.append((round(lon, 6), round(lat, 6)))
    return geo


def mercator(lon: float, lat: float) -> tuple[float, float]:
    lat = max(min(lat, 85.05112878), -85.05112878)
    x = lon * math.pi / 180.0 * 6378137.0
    y = math.log(math.tan((90.0 + lat) * math.pi / 360.0)) * 6378137.0
    return round(x, 2), round(y, 2)


def write_sql(coords: list[tuple[float, float, float, float]]) -> None:
    lines = [
        "-- BAŞARSOFT yazısı: 10.000 harita noktası (Türkiye üzerinde)",
        "-- Üretim: python database/generate_basartext_seed.py",
        "-- Tekrar çalıştırıldığında önce BASAR-* kayıtları silinir.",
        "",
        "DO $$",
        "DECLARE",
        "  uid uuid;",
        "BEGIN",
        '  SELECT "Id" INTO uid FROM "AspNetUsers" ORDER BY "UserName" LIMIT 1;',
        "  IF uid IS NULL THEN",
        "    RAISE EXCEPTION 'Kullanıcı bulunamadı — önce API ile giriş/seed çalıştırın.';",
        "  END IF;",
        "",
        f'  DELETE FROM map_points WHERE "Number" LIKE \'{PREFIX}-%\';',
        "",
        "  INSERT INTO map_points (",
        '    "Id", "Name", "Number", "Description", "Category",',
        '    "Longitude", "Latitude", "XMercator", "YMercator",',
        '    "CreatedAt", "CreatedByUserId", "IsDeleted"',
        "  )",
        "  VALUES",
    ]

    categories = ["Depo", "Bayi", "Musteri", "Ofis"]
    value_rows = []
    for i, (lon, lat, x_m, y_m) in enumerate(coords, start=1):
        num = f"{PREFIX}-{i:05d}"
        cat = categories[(i - 1) % 4]
        value_rows.append(
            f"  (gen_random_uuid(), 'Başarsoft {i}', '{num}', "
            f"'BAŞARSOFT yazısı', '{cat}', "
            f"{lon}, {lat}, {x_m}, {y_m}, "
            f"now() AT TIME ZONE 'utc', uid, false)"
        )

    lines.append(",\n".join(value_rows))
    lines.extend(
        [
            ";",
            "END $$;",
            "",
            f'SELECT COUNT(*) AS basar_points FROM map_points WHERE "Number" LIKE \'{PREFIX}-%\';',
            "",
        ]
    )

    OUT_SQL.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_SQL} ({len(coords)} points)")


def main() -> int:
    pixels, w, h = rasterize_text()
    print(f"Raster: {w}x{h}, filled pixels: {len(pixels)}")
    sampled = sample_points(pixels, COUNT)
    geo = to_lon_lat(sampled, w, h)
    coords = [(*g, *mercator(g[0], g[1])) for g in geo]
    write_sql(coords)
    return 0


if __name__ == "__main__":
    sys.exit(main())
