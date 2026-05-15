/**
 * Mekansal sorgu yardımcıları — EPSG:3857 (metre) / 4326 nokta listesi.
 */

import { fromLonLat } from 'ol/proj';
import { containsCoordinate } from 'ol/extent';
import { Polygon } from 'ol/geom';

export const BUFFER_DISTANCES = [
  { label: '500 m', value: 500 },
  { label: '1000 m', value: 1000 },
  { label: '5000 m', value: 5000 },
];

function to3857(lon, lat) {
  return fromLonLat([lon, lat]);
}

/** Merkez noktaya göre yarıçap (metre) içindeki kayıtlar */
export function filterPointsInBuffer(points, centerLonLat, radiusM) {
  const [cx, cy] = to3857(centerLonLat.longitude, centerLonLat.latitude);
  const r2 = radiusM * radiusM;
  return points.filter((p) => {
    const [x, y] = to3857(p.longitude, p.latitude);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r2;
  });
}

/** Extent [minX, minY, maxX, maxY] EPSG:3857 */
export function filterPointsInExtent(points, extent) {
  return points.filter((p) => {
    const c = to3857(p.longitude, p.latitude);
    return containsCoordinate(extent, c);
  });
}

/** Polygon koordinatları: number[][][] (rings) EPSG:3857 */
export function filterPointsInPolygon(points, polygonCoords) {
  const poly = new Polygon(polygonCoords);
  return points.filter((p) => {
    const c = to3857(p.longitude, p.latitude);
    return poly.intersectsCoordinate(c);
  });
}

/** Extent → dikdörtgen polygon koordinatı (çizim katmanı için) */
export function extentToPolygonCoords(extent) {
  const [minX, minY, maxX, maxY] = extent;
  return [[
    [minX, minY],
    [minX, maxY],
    [maxX, maxY],
    [maxX, minY],
    [minX, minY],
  ]];
}
