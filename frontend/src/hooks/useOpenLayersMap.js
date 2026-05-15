// ============================================================================
// useOpenLayersMap — HTML konteyner ref'i ile OpenLayers haritası başlatır
// ============================================================================

import { useEffect, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { transformExtent } from 'ol/proj';

/** Türkiye sınırları (EPSG:4326 — yaklaşık) */
const TURKEY_EXTENT_4326 = [25.5, 35.8, 44.8, 42.2];

/**
 * @param {React.RefObject<HTMLDivElement | null>} containerRef
 * @returns {{ map: import('ol/Map').default | null }}
 */
export function useOpenLayersMap(containerRef) {
  const [map, setMap] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const osmLayer = new TileLayer({
      source: new OSM(),
      properties: { title: 'OpenStreetMap (Altlık)', baseLayer: true },
      zIndex: 0,
    });

    const olMap = new Map({
      target: el,
      layers: [osmLayer],
      view: new View({
        center: [0, 0],
        zoom: 2,
        constrainResolution: true,
      }),
    });

    const fitTurkey = () => {
      olMap.getView().fit(
        transformExtent(TURKEY_EXTENT_4326, 'EPSG:4326', 'EPSG:3857'),
        { padding: [40, 40, 40, 40], maxZoom: 7, duration: 0 },
      );
    };

    fitTurkey();

    // ResizeObserver + updateSize() birlikte sonsuz döngüye girip tarayıcıyı dondurabilir.
    const syncSize = () => olMap.updateSize();
    syncSize();
    const t = window.setTimeout(() => {
      syncSize();
      fitTurkey();
    }, 100);
    window.addEventListener('resize', syncSize);

    setMap(olMap);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', syncSize);
      olMap.setTarget(undefined);
      olMap.dispose();
      setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount'ta bir kez
  }, []);

  return { map };
}
