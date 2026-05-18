/** Harita feature ↔ API DTO dönüşümü ve yakınlık yardımcıları. */
import Feature from 'ol/Feature';
import { Point as OlPoint } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { PROXIMITY_THRESHOLD_M } from './mapViewConstants';

export function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function hasActiveDrawSketch(draw) {
  if (!draw) return false;
  const sketchSource = draw.getOverlay()?.getSource();
  return (sketchSource?.getFeatures().length ?? 0) > 0;
}

/** MapPointResponseDto → OpenLayers Feature */
export function dtoToFeature(dto) {
  const feature = new Feature({
    geometry: new OlPoint(fromLonLat([dto.longitude, dto.latitude])),
    pointData: dto,
  });
  feature.setId(dto.id);
  return feature;
}

export function findNearbyPoint(vectorSource, clickCoord3857) {
  if (!vectorSource) return null;

  let closest = null;
  vectorSource.getFeatures().forEach((feature) => {
    const geom = feature.getGeometry();
    if (!geom) return;
    const [fx, fy] = geom.getCoordinates();
    const dx = fx - clickCoord3857[0];
    const dy = fy - clickCoord3857[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= PROXIMITY_THRESHOLD_M) {
      if (!closest || dist < closest.distanceM) {
        const data = feature.get('pointData');
        closest = {
          name: data?.name ?? 'Bilinmeyen nokta',
          distanceM: Math.round(dist),
        };
      }
    }
  });

  return closest;
}
