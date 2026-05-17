/**
 * Zoom seviyesine göre nokta isteği üst limiti (sunucu üst sınırı ile clamp edilir).
 * Tüm zoom seviyelerinde noktalar yüklenir; sadece yoğun (uzak) görünümde
 * daha yüksek limit, yakın zoom'da daha düşük limit istenir.
 *
 * @param {number} zoom
 * @returns {number} istek başına döndürülecek üst kayıt
 */
export function resolveBboxLoadLimit(zoom) {
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
