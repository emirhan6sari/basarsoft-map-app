-- Opsiyonel performans testi: 10.000 rastgele nokta (Türkiye bbox)
-- Tekrar çalıştırıldığında önce PERF-* kayıtları silinir.

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT "Id" INTO uid FROM "AspNetUsers" ORDER BY "UserName" LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı — önce API ile giriş/seed çalıştırın.';
  END IF;

  DELETE FROM map_points WHERE "Number" LIKE 'PERF-%';

  INSERT INTO map_points (
    "Id", "Name", "Number", "Description", "Category",
    "Longitude", "Latitude", "XMercator", "YMercator",
    "CreatedAt", "CreatedByUserId", "IsDeleted"
  )
  SELECT
    gen_random_uuid(),
    'Perf Test ' || g,
    'PERF-' || lpad(g::text, 5, '0'),
    'Performans testi',
    (ARRAY['Depo', 'Bayi', 'Musteri', 'Ofis'])[1 + (g % 4)],
    26 + random() * 18,
    36 + random() * 6,
    0,
    0,
    now() AT TIME ZONE 'utc',
    uid,
    false
  FROM generate_series(1, 10000) AS g;

  UPDATE map_points
  SET
    "XMercator" = "Longitude" * pi() / 180.0 * 6378137.0,
    "YMercator" = ln(tan((90.0 + LEAST(GREATEST("Latitude", -85.05112878), 85.05112878)) * pi() / 360.0)) * 6378137.0
  WHERE "Number" LIKE 'PERF-%';
END $$;

SELECT COUNT(*) AS perf_points_inserted FROM map_points WHERE "Number" LIKE 'PERF-%';
