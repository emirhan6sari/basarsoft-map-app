-- Performans test noktalarını kaldırır (PERF-*)
DELETE FROM map_points WHERE "Number" LIKE 'PERF-%';

SELECT COUNT(*) AS remaining_perf FROM map_points WHERE "Number" LIKE 'PERF-%';
