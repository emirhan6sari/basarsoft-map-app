/** Haritada nokta yüklemesi için minimum zoom (Türkiye fit ~7; daha uzak = yükleme yok). */
export const MIN_ZOOM_FOR_POINT_LOAD = 7;

/**
 * Zoom seviyesine göre istek limiti (sunucu üst sınırı ile clamp edilir).
 * @param {number} zoom
 * @returns {number} 0 = yükleme yapma
 */
export function resolveBboxLoadLimit(zoom) {
  if (zoom < MIN_ZOOM_FOR_POINT_LOAD) return 0;
  if (zoom < 9) return 10000;
  if (zoom >= 15) return 2500;
  if (zoom >= 12) return 1800;
  if (zoom >= 10) return 1200;
  return 800;
}

/**
 * Yoğun nokta sayısında cluster mesafesi (piksel).
 * @param {number} zoom
 * @param {number} pointCount
 */
export function resolveClusterDistance(zoom, pointCount) {
  if (pointCount > 1500) return 72;
  if (pointCount > 600 || zoom < 10) return 58;
  return 45;
}
