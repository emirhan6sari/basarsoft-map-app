/**
 * Mekansal sorgu yardımcıları — EPSG:3857 (metre) / 4326 nokta listesi.
 */

import { fromLonLat } from 'ol/proj';
import { containsCoordinate } from 'ol/extent';
import { Polygon } from 'ol/geom';
import { getDistance } from 'ol/sphere';

export const BUFFER_DISTANCES = [
  { label: '500 m', value: 500 },
  { label: '1000 m', value: 1000 },
  { label: '5000 m', value: 5000 },
];

function to3857(lon, lat) {
  return fromLonLat([lon, lat]);
}

/**
 * Web Mercator'da görsel bir dairenin "gerçek metre" yarıçapı için kullanılması gereken
 * harita birimini hesaplar. EPSG:3857'de 1 birim enleme göre cos(lat) kadar gerçek metreye
 * karşılık geldiği için tersi alınır.
 */
export function mercatorRadiusForMeters(latitudeDeg, realMeters) {
  const latRad = (latitudeDeg * Math.PI) / 180;
  const scale = Math.cos(latRad);
  if (scale <= 0) return realMeters;
  return realMeters / scale;
}

/**
 * Merkez noktaya göre yarıçap (gerçek metre) içindeki kayıtlar.
 * `ol/sphere.getDistance` ile WGS84 haversine mesafesi kullanılır — Web Mercator'un
 * enleme bağlı bozulmasından etkilenmez.
 */
export function filterPointsInBuffer(points, centerLonLat, radiusM) {
  const center = [centerLonLat.longitude, centerLonLat.latitude];
  return points.filter((p) => getDistance(center, [p.longitude, p.latitude]) <= radiusM);
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
