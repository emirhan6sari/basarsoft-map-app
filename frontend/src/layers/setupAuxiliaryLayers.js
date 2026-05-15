/**
 * Yardımcı GeoJSON katmanları — il / ilçe sınırları ve örnek polygon.
 */

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill } from 'ol/style';

const geoJsonFormat = new GeoJSON({
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
});

function vectorStyle(strokeColor, fillColor, width = 1.5) {
  return new Style({
    stroke: new Stroke({ color: strokeColor, width }),
    fill: new Fill({ color: fillColor }),
  });
}

const AUXILIARY_LAYERS = [
  {
    title: 'İl Sınırları (GeoJSON)',
    url: '/data/geo/tr-iller.geojson',
    style: vectorStyle('#1565c0', 'rgba(21, 101, 192, 0.10)', 2),
    zIndex: 2,
  },
  {
    title: 'İlçe Sınırları (GeoJSON)',
    url: '/data/geo/tr-ilceler.geojson',
    style: vectorStyle('#00695c', 'rgba(0, 105, 92, 0.06)', 1),
    zIndex: 3,
  },
  {
    title: 'Örnek Polygon Katmanı',
    url: '/data/geo/ornek-polygonlar.geojson',
    style: vectorStyle('#e65100', 'rgba(230, 81, 0, 0.18)', 2.5),
    zIndex: 4,
  },
];

/**
 * OSM altlığının üzerine yardımcı katmanları ekler.
 * @returns {import('ol/layer/Vector').default[]} eklenen katmanlar (cleanup için)
 */
export function setupAuxiliaryLayers(map) {
  if (!map) return [];

  const added = [];
  let insertIndex = 1;

  AUXILIARY_LAYERS.forEach((def) => {
    const source = new VectorSource({
      url: def.url,
      format: geoJsonFormat,
    });

    const layer = new VectorLayer({
      source,
      style: def.style,
      visible: false,
      zIndex: def.zIndex,
      properties: { title: def.title, auxiliary: true },
    });

    map.getLayers().insertAt(insertIndex, layer);
    insertIndex += 1;
    added.push(layer);
  });

  return added;
}
