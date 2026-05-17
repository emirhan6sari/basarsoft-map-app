import { getArea, getLength } from 'ol/sphere';

/** Geodezik uzunluk (EPSG:3857 geometrisi). */
export function formatLength(geometry) {
  const meters = getLength(geometry);
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} km`;
  }
  return `${meters.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m`;
}

/** Geodezik alan (EPSG:3857 geometrisi). */
export function formatArea(geometry) {
  const sqM = getArea(geometry);
  if (sqM >= 1_000_000) {
    return `${(sqM / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} km²`;
  }
  if (sqM >= 10_000) {
    return `${(sqM / 10_000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ha`;
  }
  return `${sqM.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²`;
}

/** Çizgi veya poligon geometrisinden ölçüm metni. */
export function measureGeometry(geometry) {
  if (!geometry) return null;
  const type = geometry.getType();
  if (type === 'LineString') {
    return { kind: 'length', value: formatLength(geometry) };
  }
  if (type === 'Polygon') {
    return { kind: 'area', value: formatArea(geometry) };
  }
  return null;
}
