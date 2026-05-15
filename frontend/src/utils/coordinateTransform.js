/**
 * EPSG:4326 (WGS84) ↔ EPSG:3857 (Web Mercator) — OpenLayers proj ile uyumlu.
 */

import { fromLonLat, toLonLat } from 'ol/proj';

export function wgs84ToWebMercator(longitude, latitude) {
  const [xMercator, yMercator] = fromLonLat([longitude, latitude]);
  return { xMercator, yMercator };
}

export function webMercatorToWgs84(xMercator, yMercator) {
  const [longitude, latitude] = toLonLat([xMercator, yMercator]);
  return { longitude, latitude };
}

/** Harita tıklaması / fare konumu için tam koordinat seti */
export function coordinateSetFrom3857(xMercator, yMercator) {
  const wgs = webMercatorToWgs84(xMercator, yMercator);
  return { ...wgs, xMercator, yMercator };
}

export function coordinateSetFrom4326(longitude, latitude) {
  const merc = wgs84ToWebMercator(longitude, latitude);
  return { longitude, latitude, ...merc };
}

export function fmt4326(lon, lat, digits = 5) {
  return `Lon ${Number(lon).toFixed(digits)}° · Lat ${Number(lat).toFixed(digits)}°`;
}

export function fmt3857(x, y, digits = 2) {
  return `X ${Number(x).toFixed(digits)} m · Y ${Number(y).toFixed(digits)} m`;
}
