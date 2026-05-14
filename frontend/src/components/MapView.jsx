// ============================================================================
// MapView — OpenLayers haritasını barındıran konteyner bileşeni
// ----------------------------------------------------------------------------
// Sorumluluğu:
//   1) Haritanın render edileceği <div>'i sağlar (ref ile useOpenLayersMap'e
//      aktarılır)
//   2) Harita örneğine "pointermove" event listener ekleyerek mouse'un
//      anlık koordinatlarını yakalar
//   3) Bu koordinatları CoordinateBox bileşenine (alt orta) iletir
//   4) Katman yönetimi için LayersPanel'i (sağ alt) render eder
//
// Ödev şartı: Harita tam ekran alt bölümü kaplar, mouse koordinatları
// anlık güncellenir, katmanlar açılıp kapatılabilir.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { toLonLat } from 'ol/proj';

import { useOpenLayersMap } from '../hooks/useOpenLayersMap';
import CoordinateBox from './CoordinateBox';
import LayersPanel from './LayersPanel';

function MapView() {
  // OpenLayers'ın render edeceği div'in ref'i.
  // useOpenLayersMap bu ref'i kullanarak haritayı içine yerleştirir.
  const mapContainerRef = useRef(null);

  // Custom hook → harita örneği
  const { map } = useOpenLayersMap(mapContainerRef);

  // Mouse koordinat state'i (EPSG:4326)
  const [lonLat, setLonLat] = useState(null);

  // Harita hazır olunca pointermove event'ini bağla
  useEffect(() => {
    if (!map) return;

    // OpenLayers'ın "pointermove" event'i fareyi/temas hareketini yakalar.
    // event.coordinate → harita projeksiyonundaki koordinat (default: EPSG:3857)
    const handlePointerMove = (event) => {
      // toLonLat: EPSG:3857 → EPSG:4326 dönüşümü (built-in proj4)
      const coord4326 = toLonLat(event.coordinate);
      setLonLat({ lon: coord4326[0], lat: coord4326[1] });
    };

    // Fare harita dışına çıkınca koordinatları temizle
    const handlePointerOut = () => {
      setLonLat(null);
    };

    map.on('pointermove', handlePointerMove);
    // OpenLayers'ın kendisi "pointerout" sağlamıyor; viewport elementi DOM
    // event'iyle yakalayalım
    const viewport = map.getViewport();
    viewport.addEventListener('mouseout', handlePointerOut);

    return () => {
      map.un('pointermove', handlePointerMove);
      viewport.removeEventListener('mouseout', handlePointerOut);
    };
  }, [map]);

  return (
    // position: relative → koordinat kutusu ve katman paneli absolute olarak
    // bu konteynerin içinde konumlansın
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Haritanın render edileceği konteyner.
          OpenLayers'ın hazır kontrolleri (zoom + / -) sol üstte otomatik görünür. */}
      <Box
        ref={mapContainerRef}
        sx={{
          width: '100%',
          height: '100%',
          // OL controls "ol-unselectable" sınıfı kullanır; MUI baseline
          // user-select'i resetlemiş olabilir, bu güvenlik kalkanı.
          userSelect: 'none',
        }}
      />

      {/* Alt orta: koordinat göstergesi */}
      <CoordinateBox lonLat={lonLat} />

      {/* Sağ alt: katman paneli */}
      <LayersPanel map={map} />
    </Box>
  );
}

export default MapView;
