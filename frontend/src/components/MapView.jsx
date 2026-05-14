// ============================================================================
// MapView — OpenLayers haritasını barındıran konteyner bileşeni
// ----------------------------------------------------------------------------
// Sorumluluğu:
//   1) Haritanın render edileceği <div>'i sağlar (ref ile useOpenLayersMap'e
//      aktarılır)
//   2) Harita örneğine "pointermove" event listener ekleyerek mouse'un
//      anlık koordinatlarını yakalar
//   3) Koordinatları EPSG:4326 ve EPSG:3857 formatlarına çevirip
//      CoordinateBox bileşenine geçirir
//
// Ödev şartı: Harita tam ekran alt bölümü kaplar, mouse koordinatları
// anlık güncellenir.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { toLonLat } from 'ol/proj';

import { useOpenLayersMap } from '../hooks/useOpenLayersMap';
import CoordinateBox from './CoordinateBox';

function MapView() {
  // OpenLayers'ın render edeceği div'in ref'i.
  // useOpenLayersMap bu ref'i kullanarak haritayı içine yerleştirir.
  const mapContainerRef = useRef(null);

  // Custom hook → harita örneği
  const { map } = useOpenLayersMap(mapContainerRef);

  // Mouse koordinat state'leri
  const [lonLat, setLonLat] = useState(null);     // EPSG:4326
  const [mercator, setMercator] = useState(null); // EPSG:3857

  // Harita hazır olunca pointermove event'ini bağla
  useEffect(() => {
    if (!map) return;

    // OpenLayers'ın "pointermove" event'i fareyi/temas hareketini yakalar.
    // event.coordinate → harita projeksiyonundaki koordinat (default: EPSG:3857)
    const handlePointerMove = (event) => {
      const coord3857 = event.coordinate;          // [x, y] EPSG:3857
      const coord4326 = toLonLat(coord3857);       // [lon, lat] EPSG:4326

      setMercator({ x: coord3857[0], y: coord3857[1] });
      setLonLat({ lon: coord4326[0], lat: coord4326[1] });
    };

    // Fare harita dışına çıkınca koordinatları temizle
    const handlePointerOut = () => {
      setLonLat(null);
      setMercator(null);
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
    // position: relative → CoordinateBox absolute'lanmış olarak içeride durabilsin
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

      {/* Sağ üst köşede koordinat göstergesi */}
      <CoordinateBox lonLat={lonLat} mercator={mercator} />
    </Box>
  );
}

export default MapView;
