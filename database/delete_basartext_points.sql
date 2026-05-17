-- BAŞARSOFT yazı test noktalarını kaldırır (BASAR-*)
DELETE FROM map_points WHERE "Number" LIKE 'BASAR-%';

SELECT COUNT(*) AS remaining_basar FROM map_points WHERE "Number" LIKE 'BASAR-%';
