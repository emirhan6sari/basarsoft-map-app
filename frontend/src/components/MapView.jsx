// ============================================================================
// MapView — OpenLayers haritasını barındıran konteyner bileşeni
// ----------------------------------------------------------------------------
// Sorumluluğu:
//   1) Haritanın render edileceği <div>'i sağlar
//   2) Mouse pointermove → CoordinateBox (alt orta)
//   3) Katman yönetimi → LayersPanel (sol alt)
//   4) "Noktalar" VectorLayer — backend'den çekilen noktaları gösterir
//   5) addPoint modu — haritaya tıklanınca:
//        a) Yakın mesafede (<= PROXIMITY_THRESHOLD_M) nokta varsa uyarı göster
//        b) Kullanıcı onaylarsa / yakın nokta yoksa AddPointModal aç
//        c) Başarılı kayıt → haritaya ekle
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { Point as OlPoint } from 'ol/geom';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';

import { useOpenLayersMap } from '../hooks/useOpenLayersMap';
import CoordinateBox from './CoordinateBox';
import LayersPanel from './LayersPanel';
import AddPointModal from './AddPointModal';
import { listMapPoints } from '../api/mapPoints';

// -----------------------------------------------------------------------
// Yakın nokta eşiği: 50 metre (EPSG:3857 metre cinsindendir).
// OpenLayers'ın map.getView().getProjection() default'u EPSG:3857 (metre).
// -----------------------------------------------------------------------
const PROXIMITY_THRESHOLD_M = 50;

const POINT_STYLE = new Style({
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: '#e53935' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
  }),
});

/** MapPointResponseDto → OpenLayers Feature */
function dtoToFeature(dto) {
  const feature = new Feature({
    geometry: new OlPoint(fromLonLat([dto.longitude, dto.latitude])),
    pointData: dto, // tüm veriyi feature üzerinde taşı (ileride popup için kullanışlı)
  });
  feature.setId(dto.id);
  return feature;
}

/**
 * Tıklama noktasına en yakın mevcut noktanın adını döner; eşik aşılmıyorsa null.
 * @param {import('ol/source/Vector').default} source
 * @param {number[]} clickCoord3857  [x, y] EPSG:3857
 * @returns {{ name: string, distanceM: number } | null}
 */
function findNearbyPoint(source, clickCoord3857) {
  let closest = null;

  source.getFeatures().forEach((feature) => {
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

/**
 * @param {{ activeMode: string|null, onModeConsumed: () => void }} props
 */
function MapView({ activeMode, onModeConsumed }) {
  const mapContainerRef = useRef(null);
  const { map }         = useOpenLayersMap(mapContainerRef);

  const [lonLat, setLonLat]               = useState(null);
  const pointsSourceRef                   = useRef(null);

  // AddPointModal
  const [modalOpen, setModalOpen]         = useState(false);
  const [pendingCoord, setPendingCoord]   = useState(null);

  // Yakın nokta uyarı dialog'u
  const [warnOpen, setWarnOpen]           = useState(false);
  const [warnText, setWarnText]           = useState('');
  // Kullanıcı "yine de ekle" derse modal'ı açmak için koordinatı saklarız
  const pendingAfterWarnRef               = useRef(null);

  // -------------------------------------------------------------------
  // 1) Haritaya "Noktalar" VectorLayer ekle + backend'den yükle
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return;

    const source = new VectorSource();
    pointsSourceRef.current = source;

    const layer = new VectorLayer({ source, style: POINT_STYLE });
    layer.set('title', 'Noktalar');
    map.addLayer(layer);

    let cancelled = false;
    listMapPoints()
      .then((dtos) => {
        if (cancelled) return;
        source.addFeatures(dtos.map(dtoToFeature));
      })
      .catch((err) => console.error('Noktalar yüklenemedi:', err));

    return () => {
      cancelled = true;
      map.removeLayer(layer);
      pointsSourceRef.current = null;
    };
  }, [map]);

  // -------------------------------------------------------------------
  // 2) Mouse koordinatları → CoordinateBox
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return;
    const onMove = (e) => {
      const [lon, lat] = toLonLat(e.coordinate);
      setLonLat({ lon, lat });
    };
    map.on('pointermove', onMove);
    return () => map.un('pointermove', onMove);
  }, [map]);

  // -------------------------------------------------------------------
  // 3) addPoint modu — tıklamayı yakala
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || activeMode !== 'addPoint') return;

    const viewport = map.getViewport();
    const prevCursor = viewport.style.cursor;
    viewport.style.cursor = 'crosshair';

    const onClick = (e) => {
      // e.coordinate EPSG:3857 cinsinden
      const coord3857 = e.coordinate;
      const [lon, lat] = toLonLat(coord3857);
      const coord4326  = { longitude: lon, latitude: lat };

      // Yakın nokta kontrolü
      const nearby = pointsSourceRef.current
        ? findNearbyPoint(pointsSourceRef.current, coord3857)
        : null;

      if (nearby) {
        // Uyarı dialog'unu göster; kullanıcı onaylarsa modal açılacak
        pendingAfterWarnRef.current = coord4326;
        setWarnText(
          `"${nearby.name}" noktasına yaklaşık ${nearby.distanceM} m uzaklıkta ` +
          `zaten bir nokta var. Yine de yeni nokta eklemek istiyor musunuz?`
        );
        setWarnOpen(true);
      } else {
        setPendingCoord(coord4326);
        setModalOpen(true);
      }
    };

    map.on('click', onClick);
    return () => {
      map.un('click', onClick);
      viewport.style.cursor = prevCursor;
    };
  }, [map, activeMode]);

  // -------------------------------------------------------------------
  // Uyarı dialog'u: "Yine de Ekle" → modal aç
  // -------------------------------------------------------------------
  const handleWarnConfirm = () => {
    setWarnOpen(false);
    setPendingCoord(pendingAfterWarnRef.current);
    setModalOpen(true);
    pendingAfterWarnRef.current = null;
  };

  const handleWarnCancel = () => {
    setWarnOpen(false);
    pendingAfterWarnRef.current = null;
  };

  // -------------------------------------------------------------------
  // Modal kaydedildi
  // -------------------------------------------------------------------
  const handleCreated = (dto) => {
    pointsSourceRef.current?.addFeature(dtoToFeature(dto));
    onModeConsumed?.();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPendingCoord(null);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box ref={mapContainerRef} sx={{ width: '100%', height: '100%', userSelect: 'none' }} />

      <CoordinateBox lonLat={lonLat} />
      <LayersPanel map={map} />

      {/* addPoint modu banner'ı */}
      {activeMode === 'addPoint' && !modalOpen && !warnOpen && (
        <Alert
          severity="info"
          onClose={() => onModeConsumed?.()}
          sx={{
            position: 'absolute',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            backgroundColor: 'rgba(255,255,255,0.96)',
            boxShadow: 2,
            whiteSpace: 'nowrap',
          }}
        >
          Yeni nokta eklemek için haritaya tıklayın
        </Alert>
      )}

      {/* Yakın nokta uyarısı */}
      <Dialog open={warnOpen} onClose={handleWarnCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Yakın Nokta Uyarısı</DialogTitle>
        <DialogContent>
          <DialogContentText>{warnText}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleWarnCancel}>İptal</Button>
          <Button onClick={handleWarnConfirm} variant="contained" color="warning">
            Yine de Ekle
          </Button>
        </DialogActions>
      </Dialog>

      <AddPointModal
        open={modalOpen}
        coordinate={pendingCoord}
        onCreated={handleCreated}
        onClose={handleModalClose}
      />
    </Box>
  );
}

export default MapView;
