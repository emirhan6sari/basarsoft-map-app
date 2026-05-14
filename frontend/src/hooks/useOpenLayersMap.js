// ============================================================================
// useOpenLayersMap — Bir HTML konteyner referansı (ref) verildiğinde içinde
// OpenLayers haritasını başlatan custom React hook.
// ----------------------------------------------------------------------------
// Neden custom hook?
//   - "Harita başlatma" mantığı bileşenden ayrılınca App/MapView temiz kalır
//   - Aynı mantık başka bileşende de kullanılabilir (örn. mini harita)
//   - React'in lifecycle'ı (useEffect cleanup) ile harita tek bir yerde
//     başlatılır ve unmount'ta düzgün kapatılır
// ----------------------------------------------------------------------------
// Dönüş: { map } → harita örneği (ileride katman/etkileşim eklemek için
// dışarıdan erişilebilir).
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';

/**
 * Türkiye merkezi (EPSG:4326). Konya civarı; Türkiye'yi ortalar.
 */
const TURKEY_CENTER_LONLAT = [35.0, 39.0];

/**
 * Başlangıç zoom seviyesi. 6 → Türkiye'nin tamamı görünür.
 */
const INITIAL_ZOOM = 6;

/**
 * @param {React.RefObject<HTMLDivElement>} containerRef
 *   Haritanın render edileceği div'in ref'i.
 * @returns {{ map: import('ol/Map').default | null }}
 */
export function useOpenLayersMap(containerRef) {
  // Haritayı state'te tutuyoruz ki dış bileşen ona event listener ekleyebilsin
  const [map, setMap] = useState(null);

  // Aynı harita örneğinin React re-render'da iki kez oluşturulmasını engellemek
  // için ref kullanıyoruz. useEffect zaten StrictMode'da iki kez koşar ama
  // cleanup ile düzgün yönetiyoruz.
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Konteyner henüz mount edilmemişse bekle
    if (!containerRef.current) return;

    // Daha önce oluşturulmuş bir harita varsa tekrar yaratma (StrictMode önlemi)
    if (mapInstanceRef.current) return;

    // OSM base layer — ödev şartı (madde 1: "Base layer olarak OpenStreetMap")
    const osmLayer = new TileLayer({
      source: new OSM(),
      properties: { title: 'OpenStreetMap', baseLayer: true },
    });

    // Harita örneğini oluştur
    const olMap = new Map({
      target: containerRef.current,
      layers: [osmLayer],
      view: new View({
        // OpenLayers içeride web mercator (EPSG:3857) kullanır.
        // fromLonLat: WGS84 → Web Mercator dönüşümü
        center: fromLonLat(TURKEY_CENTER_LONLAT),
        zoom: INITIAL_ZOOM,
        // Tüm dünyayı kaydırma sırasında "kopyalamayı" engelle
        constrainResolution: true,
      }),
    });

    mapInstanceRef.current = olMap;
    setMap(olMap);

    // CLEANUP: bileşen unmount olduğunda haritayı düzgün kapat
    // (memory leak ve duplicate map'i engeller)
    return () => {
      olMap.setTarget(undefined);
      mapInstanceRef.current = null;
      setMap(null);
    };
    // containerRef sabit olduğu için sadece mount'ta çalışır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { map };
}
