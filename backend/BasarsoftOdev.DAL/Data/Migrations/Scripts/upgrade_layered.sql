-- Mevcut veritabanını katmanlı mimari şemasına yükseltir (idempotent)

ALTER TABLE map_points ADD COLUMN IF NOT EXISTS "Longitude" double precision NOT NULL DEFAULT 0;
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS "Latitude" double precision NOT NULL DEFAULT 0;
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS "XMercator" double precision NOT NULL DEFAULT 0;
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS "YMercator" double precision NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_points' AND column_name = 'Location'
  ) THEN
    UPDATE map_points
    SET "Longitude" = ST_X("Location"::geometry),
        "Latitude"  = ST_Y("Location"::geometry)
    WHERE "Location" IS NOT NULL;
  END IF;
END $$;

-- Web Mercator (EPSG:3857) yaklaşık dönüşüm
UPDATE map_points
SET "XMercator" = "Longitude" * pi() / 180.0 * 6378137.0,
    "YMercator" = ln(tan((90.0 + LEAST(GREATEST("Latitude", -85.05112878), 85.05112878)) * pi() / 360.0)) * 6378137.0
WHERE "Longitude" <> 0 OR "Latitude" <> 0;

-- Soft delete (MapPoint)
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS "IsDeleted" boolean NOT NULL DEFAULT false;
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS "DeletedAt" timestamptz NULL;
ALTER TABLE map_points ADD COLUMN IF NOT EXISTS "DeletedByUserId" uuid NULL;
CREATE INDEX IF NOT EXISTS "IX_map_points_IsDeleted" ON map_points ("IsDeleted");
CREATE INDEX IF NOT EXISTS "IX_map_points_XMercator_YMercator" ON map_points ("XMercator", "YMercator");

COMMENT ON COLUMN map_points."Longitude" IS 'EPSG:4326 — boylam (derece, WGS84)';
COMMENT ON COLUMN map_points."Latitude" IS 'EPSG:4326 — enlem (derece, WGS84)';
COMMENT ON COLUMN map_points."XMercator" IS 'EPSG:3857 — X (metre, Web Mercator)';
COMMENT ON COLUMN map_points."YMercator" IS 'EPSG:3857 — Y (metre, Web Mercator)';
