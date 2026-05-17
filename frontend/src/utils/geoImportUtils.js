import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';

const geoJson = new GeoJSON();
const wkt = new WKT();

const READ_OPTS = { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' };

function countGeometryVertices(geometry) {
  if (!geometry) return 0;
  const type = geometry.getType();
  if (type === 'Point') return 1;
  if (type === 'MultiPoint') return geometry.getCoordinates().length;
  if (type === 'LineString') return dedupeCoords(geometry.getCoordinates()).length;
  if (type === 'MultiLineString') {
    return geometry.getLineStrings().reduce((n, ls) => n + dedupeCoords(ls.getCoordinates()).length, 0);
  }
  if (type === 'Polygon') {
    let n = dedupeCoords(geometry.getLinearRing(0).getCoordinates()).length;
    for (let i = 1; i < geometry.getLinearRingCount(); i += 1) {
      n += dedupeCoords(geometry.getLinearRing(i).getCoordinates()).length;
    }
    return n;
  }
  if (type === 'MultiPolygon') {
    return geometry.getPolygons().reduce((sum, poly) => sum + countGeometryVertices(poly), 0);
  }
  if (type === 'GeometryCollection') {
    return geometry.getGeometries().reduce((sum, g) => sum + countGeometryVertices(g), 0);
  }
  return 0;
}

function dedupeCoords(coords) {
  if (!coords?.length) return [];
  const out = [];
  let prev = null;
  coords.forEach((c) => {
    if (prev && Math.abs(prev[0] - c[0]) < 1e-9 && Math.abs(prev[1] - c[1]) < 1e-9) return;
    out.push(c);
    prev = c;
  });
  return out;
}

/** İçe aktarımda kaydedilecek yaklaşık nokta sayısı (önizleme). */
export function estimateImportPointCount(format, content) {
  const trimmed = content?.trim();
  if (!trimmed) return null;

  try {
    const normalized = format === 'wkt' ? 'wkt' : 'geojson';
    const features = normalized === 'wkt'
      ? [wkt.readFeature(trimmed, READ_OPTS)].filter((f) => f?.getGeometry())
      : geoJson.readFeatures(trimmed, READ_OPTS);

    if (!features.length) return 0;
    return features.reduce((sum, f) => sum + countGeometryVertices(f.getGeometry()), 0);
  } catch {
    return null;
  }
}
