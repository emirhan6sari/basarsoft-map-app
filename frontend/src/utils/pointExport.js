/**
 * Nokta listesi dışa aktarma — GeoJSON (RFC 7946) ve CSV.
 */

const GEOJSON_TYPE = 'FeatureCollection';

function isValidCoord(lon, lat) {
  return (
    typeof lon === 'number' && Number.isFinite(lon)
    && typeof lat === 'number' && Number.isFinite(lat)
    && lon >= -180 && lon <= 180
    && lat >= -90 && lat <= 90
  );
}

function categoryDisplayName(categories, categoryName) {
  const cat = categories?.find((c) => (c.name ?? c.Name) === categoryName);
  return cat?.displayName ?? cat?.DisplayName ?? categoryName ?? '';
}

/**
 * RFC 7946 uyumlu FeatureCollection — koordinatlar [longitude, latitude] (EPSG:4326).
 */
export function pointsToGeoJSON(points, categories = []) {
  const features = [];

  for (const p of points ?? []) {
    const lon = p.longitude;
    const lat = p.latitude;
    if (!isValidCoord(lon, lat)) continue;

    features.push({
      type: 'Feature',
      id: p.id,
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        id: p.id,
        name: p.name ?? '',
        number: p.number ?? '',
        category: p.category ?? '',
        categoryDisplayName: categoryDisplayName(categories, p.category),
        description: p.description ?? null,
        longitude: lon,
        latitude: lat,
        xMercator: p.xMercator ?? null,
        yMercator: p.yMercator ?? null,
        createdAt: p.createdAt ?? null,
      },
    });
  }

  return {
    type: GEOJSON_TYPE,
    features,
  };
}

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_HEADERS = [
  'id', 'name', 'number', 'category', 'categoryDisplayName', 'description',
  'longitude', 'latitude', 'xMercator', 'yMercator', 'createdAt',
];

export function pointsToCSV(points, categories = []) {
  const lines = [CSV_HEADERS.join(',')];

  for (const p of points ?? []) {
    lines.push([
      p.id,
      p.name,
      p.number,
      p.category,
      categoryDisplayName(categories, p.category),
      p.description,
      p.longitude,
      p.latitude,
      p.xMercator,
      p.yMercator,
      p.createdAt,
    ].map(csvEscape).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function timestampSuffix() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportPointsGeoJSON(points, categories = []) {
  const geojson = pointsToGeoJSON(points, categories);
  if (geojson.features.length === 0) {
    return { ok: false, message: 'Dışa aktarılacak geçerli koordinatlı nokta yok.' };
  }
  const json = `${JSON.stringify(geojson, null, 2)}\n`;
  downloadTextFile(json, `map-points_${timestampSuffix()}.geojson`, 'application/geo+json;charset=utf-8');
  return { ok: true, count: geojson.features.length };
}

export function exportPointsCSV(points, categories = []) {
  if (!points?.length) {
    return { ok: false, message: 'Dışa aktarılacak kayıt yok.' };
  }
  const csv = pointsToCSV(points, categories);
  downloadTextFile(csv, `map-points_${timestampSuffix()}.csv`, 'text/csv;charset=utf-8');
  return { ok: true, count: points.length };
}
