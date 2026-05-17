import { toLonLat } from 'ol/proj';

/** OpenLayers extent (EPSG:3857) → WGS84 bbox query parametreleri. */
export function extentToBbox4326(extent) {
  if (!extent?.length) return null;

  const [minLon, minLat] = toLonLat([extent[0], extent[1]]);
  const [maxLon, maxLat] = toLonLat([extent[2], extent[3]]);

  return {
    minLon: Math.min(minLon, maxLon),
    minLat: Math.min(minLat, maxLat),
    maxLon: Math.max(minLon, maxLon),
    maxLat: Math.max(minLat, maxLat),
  };
}

/** Harita görünümünden bbox (EPSG:4326). */
export function bboxFromMap(map) {
  if (!map) return null;
  const extent = map.getView().calculateExtent(map.getSize());
  return extentToBbox4326(extent);
}
