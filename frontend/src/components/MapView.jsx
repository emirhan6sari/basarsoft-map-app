// ============================================================================
// MapView — OpenLayers haritası, cluster + kategori stilleri + mekansal sorgu
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
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
import Cluster from 'ol/source/Cluster';
import Feature from 'ol/Feature';
import { Point as OlPoint, Circle as OlCircle, Polygon as OlPolygon } from 'ol/geom';
import { fromLonLat, toLonLat } from 'ol/proj';
import Draw from 'ol/interaction/Draw';
import DragBox from 'ol/interaction/DragBox';

import { useOpenLayersMap } from '../hooks/useOpenLayersMap';
import CoordinateBox from './CoordinateBox';
import LayersPanel from './LayersPanel';
import AddPointModal from './AddPointModal';
import QueryPointsModal from './QueryPointsModal';
import PointDetailPopup from './PointDetailPopup';
import CategoryLegend from './CategoryLegend';
import SpatialQueryToolbar from './SpatialQueryToolbar';
import BufferDistanceDialog from './BufferDistanceDialog';
import { listMapPoints } from '../api/mapPoints';
import { fetchCategories } from '../api/categories';
import { isAuthenticated } from '../api/auth';
import {
  CLUSTER_OPTIONS,
  HIGHLIGHT_STYLE,
  SPATIAL_QUERY_STYLE,
  createClusterStyleFunction,
  registerCategories,
} from '../utils/mapPointStyles';
import {
  filterPointsInBuffer,
  filterPointsInExtent,
  filterPointsInPolygon,
  extentToPolygonCoords,
} from '../utils/spatialQuery';
import { coordinateSetFrom3857 } from '../utils/coordinateTransform';
import { setupAuxiliaryLayers } from '../layers/setupAuxiliaryLayers';

const PROXIMITY_THRESHOLD_M = 50;

const SPATIAL_HINTS = {
  spatialBuffer: 'Buffer merkezi için haritaya tıklayın • İptal: Esc',
  spatialBox: 'Dikdörtgen alan çizmek için sürükleyin • İptal: Esc',
  spatialPolygon: 'Poligon çizmek için tıklayın; bitirmek için çift tıklayın • İptal: Esc',
};

function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function hasActiveDrawSketch(draw) {
  if (!draw) return false;
  const sketchSource = draw.getOverlay()?.getSource();
  return (sketchSource?.getFeatures().length ?? 0) > 0;
}

/** MapPointResponseDto → OpenLayers Feature */
function dtoToFeature(dto) {
  const feature = new Feature({
    geometry: new OlPoint(fromLonLat([dto.longitude, dto.latitude])),
    pointData: dto,
  });
  feature.setId(dto.id);
  return feature;
}

function findNearbyPoint(vectorSource, clickCoord3857) {
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

function MapView({ activeMode, onModeConsumed }) {
  const mapContainerRef = useRef(null);
  const { map } = useOpenLayersMap(mapContainerRef);

  const [pointerCoord, setPointerCoord] = useState(null);
  const [clickCoord, setClickCoord] = useState(null);
  const [loggedIn, setLoggedIn] = useState(() => isAuthenticated());
  const [categories, setCategories] = useState([]);

  const vectorSourceRef = useRef(null);
  const highlightSourceRef = useRef(null);
  const querySourceRef = useRef(null);
  const pointsDataRef = useRef([]);
  const drawInteractionRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCoord, setPendingCoord] = useState(null);
  const [queryOpen, setQueryOpen] = useState(false);
  const [spatialResults, setSpatialResults] = useState(null);
  const [spatialResultsTitle, setSpatialResultsTitle] = useState('Nokta Sorgulama');
  const [spatialResultsHint, setSpatialResultsHint] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnText, setWarnText] = useState('');
  const pendingAfterWarnRef = useRef(null);

  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [spatialOpen, setSpatialOpen] = useState(false);
  const [spatialMode, setSpatialMode] = useState(null);
  const [bufferDialogOpen, setBufferDialogOpen] = useState(false);
  const [bufferCenter, setBufferCenter] = useState(null);
  const [bufferCenterLabel, setBufferCenterLabel] = useState('');

  const clearQueryLayer = useCallback(() => {
    querySourceRef.current?.clear();
  }, []);

  const highlightMultiple = useCallback((dtos) => {
    const hl = highlightSourceRef.current;
    if (!hl) return;
    hl.clear();
    dtos.forEach((dto) => {
      hl.addFeature(new Feature({
        geometry: new OlPoint(fromLonLat([dto.longitude, dto.latitude])),
      }));
    });
  }, []);

  const openSpatialResults = useCallback((points, title, hint) => {
    setSpatialResults(points);
    setSpatialResultsTitle(title);
    setSpatialResultsHint(hint);
    setQueryOpen(true);
  }, []);

  const handleSpatialClose = useCallback(() => {
    setSpatialOpen(false);
    setSpatialMode(null);
    setBufferDialogOpen(false);
    setBufferCenter(null);
    clearQueryLayer();
    highlightSourceRef.current?.clear();
  }, [clearQueryLayer]);

  const handleSpatialToolSelect = useCallback((mode) => {
    clearQueryLayer();
    highlightSourceRef.current?.clear();
    setSpatialMode(mode);
    setBufferDialogOpen(false);
    setBufferCenter(null);
  }, [clearQueryLayer]);

  const cancelSpatialTool = useCallback(() => {
    setSpatialMode(null);
    setBufferDialogOpen(false);
    setBufferCenter(null);
    clearQueryLayer();
    highlightSourceRef.current?.clear();
  }, [clearQueryLayer]);

  const cancelCurrentOperation = useCallback(() => {
    if (bufferDialogOpen) {
      setBufferDialogOpen(false);
      setBufferCenter(null);
      return true;
    }
    if (modalOpen) {
      setModalOpen(false);
      setPendingCoord(null);
      return true;
    }
    if (warnOpen) {
      setWarnOpen(false);
      pendingAfterWarnRef.current = null;
      return true;
    }
    if (queryOpen) {
      setQueryOpen(false);
      setSpatialResults(null);
      setSpatialResultsTitle('Nokta Sorgulama');
      setSpatialResultsHint(null);
      return true;
    }
    if (detailOpen) {
      setDetailOpen(false);
      setSelectedPoint(null);
      return true;
    }
    if (spatialMode === 'spatialPolygon' && drawInteractionRef.current) {
      const draw = drawInteractionRef.current;
      if (hasActiveDrawSketch(draw)) {
        draw.abortDrawing();
        return true;
      }
    }
    if (spatialMode) {
      cancelSpatialTool();
      return true;
    }
    if (spatialOpen) {
      handleSpatialClose();
      return true;
    }
    if (activeMode === 'addPoint') {
      onModeConsumed?.();
      return true;
    }
    return false;
  }, [
    bufferDialogOpen,
    modalOpen,
    warnOpen,
    queryOpen,
    detailOpen,
    spatialMode,
    spatialOpen,
    activeMode,
    cancelSpatialTool,
    handleSpatialClose,
    onModeConsumed,
  ]);

  // -------------------------------------------------------------------
  // Esc — anlık işlemi iptal
  // -------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isEditableTarget(e.target)) return;
      if (cancelCurrentOperation()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [cancelCurrentOperation]);

  // -------------------------------------------------------------------
  // Yardımcı GeoJSON katmanları (il / ilçe / örnek polygon)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return;
    const auxLayers = setupAuxiliaryLayers(map);
    return () => auxLayers.forEach((layer) => map.removeLayer(layer));
  }, [map]);

  // -------------------------------------------------------------------
  // Noktalar + vurgulama + mekansal sorgu geometri katmanları
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const clusterSource = new Cluster({
      ...CLUSTER_OPTIONS,
      source: vectorSource,
    });

    const pointsLayer = new VectorLayer({
      source: clusterSource,
      style: createClusterStyleFunction(),
      zIndex: 6,
    });
    pointsLayer.set('title', 'Noktalar');
    map.addLayer(pointsLayer);

    const hlSource = new VectorSource();
    highlightSourceRef.current = hlSource;
    const hlLayer = new VectorLayer({
      source: hlSource,
      style: HIGHLIGHT_STYLE,
      zIndex: 10,
    });
    hlLayer.set('title', 'Vurgulama');
    map.addLayer(hlLayer);

    const querySource = new VectorSource();
    querySourceRef.current = querySource;
    const queryLayer = new VectorLayer({
      source: querySource,
      style: SPATIAL_QUERY_STYLE,
      zIndex: 5,
    });
    queryLayer.set('title', 'Mekansal Sorgu');
    map.addLayer(queryLayer);

    let cancelled = false;
    const authenticated = isAuthenticated();
    setLoggedIn(authenticated);

    if (authenticated) {
      Promise.all([listMapPoints(), fetchCategories()])
        .then(([dtos, cats]) => {
          if (cancelled) return;
          const list = dtos ?? [];
          pointsDataRef.current = list;
          const categoryList = cats ?? [];
          registerCategories(categoryList);
          setCategories(categoryList);
          vectorSource.addFeatures(list.map(dtoToFeature));
          map.getLayers().getArray()
            .find((l) => l.get('title') === 'Noktalar')
            ?.changed();
        })
        .catch((err) => console.error('Harita verisi yüklenemedi:', err));
    } else {
      pointsDataRef.current = [];
    }

    return () => {
      cancelled = true;
      map.removeLayer(pointsLayer);
      map.removeLayer(hlLayer);
      map.removeLayer(queryLayer);
      vectorSourceRef.current = null;
      highlightSourceRef.current = null;
      querySourceRef.current = null;
      pointsDataRef.current = [];
    };
  }, [map]);

  // -------------------------------------------------------------------
  // Fare + tıklama koordinatları (EPSG:4326 ve EPSG:3857)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return;
    const onMove = (e) => {
      const [x, y] = e.coordinate;
      const [lon, lat] = toLonLat(e.coordinate);
      setPointerCoord({ lon, lat, x, y });
    };
    map.on('pointermove', onMove);
    return () => map.un('pointermove', onMove);
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const onClick = (e) => {
      const [x, y] = e.coordinate;
      const [lon, lat] = toLonLat(e.coordinate);
      setClickCoord({ lon, lat, x, y });
    };
    map.on('singleclick', onClick);
    return () => map.un('singleclick', onClick);
  }, [map]);

  const handlePointSelect = useCallback((dto) => {
    if (!map || !highlightSourceRef.current) return;

    const center = fromLonLat([dto.longitude, dto.latitude]);
    highlightSourceRef.current.clear();
    highlightSourceRef.current.addFeature(new Feature({ geometry: new OlPoint(center) }));

    map.getView().animate({
      center,
      zoom: Math.max(map.getView().getZoom() ?? 12, 14),
      duration: 600,
    });
  }, [map]);

  useEffect(() => {
    if (activeMode === 'queryPoints') {
      setSpatialResults(null);
      setSpatialResultsTitle('Nokta Sorgulama');
      setSpatialResultsHint(null);
      setQueryOpen(true);
      onModeConsumed?.();
    }
    if (activeMode === 'spatial') {
      setSpatialOpen(true);
      onModeConsumed?.();
    }
    if (activeMode === 'layers') {
      setLayersPanelOpen(true);
      onModeConsumed?.();
    }
  }, [activeMode, onModeConsumed]);

  // -------------------------------------------------------------------
  // Noktaya tıklama → detay popup
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || activeMode === 'addPoint' || spatialMode || !loggedIn) return;

    const onClick = (e) => {
      const clusterFeature = map.forEachFeatureAtPixel(
        e.pixel,
        (f, layer) => (layer.get('title') === 'Noktalar' ? f : undefined),
        { hitTolerance: 10 },
      );

      if (!clusterFeature) return;

      const members = clusterFeature.get('features');
      if (!members?.length) return;

      if (members.length > 1) {
        map.getView().animate({
          center: e.coordinate,
          zoom: (map.getView().getZoom() ?? 10) + 2,
          duration: 350,
        });
        return;
      }

      const data = members[0].get('pointData');
      if (!data) return;

      setSelectedPoint(data);
      setDetailOpen(true);
      handlePointSelect(data);
    };

    map.on('singleclick', onClick);
    return () => map.un('singleclick', onClick);
  }, [map, activeMode, spatialMode, loggedIn, handlePointSelect]);

  // -------------------------------------------------------------------
  // Mekansal sorgu etkileşimleri
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || !spatialMode || !loggedIn) return;

    const querySource = querySourceRef.current;
    const points = pointsDataRef.current;
    const olInteractions = [];
    const cleanups = [];
    const viewport = map.getViewport();
    const prevCursor = viewport.style.cursor;
    viewport.style.cursor = 'crosshair';

    if (spatialMode === 'spatialBuffer') {
      const onClick = (e) => {
        const [lon, lat] = toLonLat(e.coordinate);
        const center = { longitude: lon, latitude: lat };
        setBufferCenter(center);
        setBufferCenterLabel(`${lat.toFixed(5)}°, ${lon.toFixed(5)}°`);
        setBufferDialogOpen(true);
      };
      map.on('singleclick', onClick);
      cleanups.push(() => map.un('singleclick', onClick));
    }

    if (spatialMode === 'spatialBox' && querySource) {
      const dragBox = new DragBox({});
      map.addInteraction(dragBox);
      olInteractions.push(dragBox);

      dragBox.on('boxend', () => {
        const extent = dragBox.getGeometry().getExtent();
        querySource.clear();
        querySource.addFeature(new Feature({
          geometry: new OlPolygon(extentToPolygonCoords(extent)),
        }));
        const found = filterPointsInExtent(points, extent);
        highlightMultiple(found);
        openSpatialResults(
          found,
          'Dikdörtgen Alan Sorgusu',
          `${found.length} nokta seçilen alan içinde`,
        );
      });
    }

    if (spatialMode === 'spatialPolygon' && querySource) {
      const draw = new Draw({ source: querySource, type: 'Polygon' });
      drawInteractionRef.current = draw;
      map.addInteraction(draw);
      olInteractions.push(draw);

      draw.on('drawend', (evt) => {
        const coords = evt.feature.getGeometry().getCoordinates();
        const found = filterPointsInPolygon(points, coords);
        highlightMultiple(found);
        openSpatialResults(
          found,
          'Poligon Sorgusu',
          `${found.length} nokta poligon içinde — haritada vurgulandı`,
        );
      });
    }

    return () => {
      drawInteractionRef.current = null;
      viewport.style.cursor = prevCursor;
      olInteractions.forEach((i) => map.removeInteraction(i));
      cleanups.forEach((fn) => fn());
    };
  }, [map, spatialMode, loggedIn, highlightMultiple, openSpatialResults]);

  const handleBufferConfirm = (radiusM) => {
    setBufferDialogOpen(false);
    if (!bufferCenter || !querySourceRef.current) return;

    const center3857 = fromLonLat([bufferCenter.longitude, bufferCenter.latitude]);
    querySourceRef.current.clear();
    querySourceRef.current.addFeature(new Feature({
      geometry: new OlCircle(center3857, radiusM),
    }));

    const points = pointsDataRef.current;
    const found = filterPointsInBuffer(points, bufferCenter, radiusM);
    highlightMultiple(found);
    openSpatialResults(
      found,
      'Buffer Sorgusu',
      `${found.length} nokta — ${radiusM} m yarıçap`,
    );
    setBufferCenter(null);
  };

  const handleBufferCancel = () => {
    setBufferDialogOpen(false);
    setBufferCenter(null);
  };

  // -------------------------------------------------------------------
  // addPoint modu
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || activeMode !== 'addPoint') return;

    const viewport = map.getViewport();
    const prevCursor = viewport.style.cursor;
    viewport.style.cursor = 'crosshair';

    const onClick = (e) => {
      if (e.originalEvent?.defaultPrevented) return;
      const [xMercator, yMercator] = e.coordinate;
      const coord4326 = coordinateSetFrom3857(xMercator, yMercator);

      const nearby = vectorSourceRef.current
        ? findNearbyPoint(vectorSourceRef.current, e.coordinate)
        : null;

      if (nearby) {
        pendingAfterWarnRef.current = coord4326;
        setWarnText(
          `"${nearby.name}" noktasına yaklaşık ${nearby.distanceM} m uzaklıkta ` +
          `zaten bir nokta var. Yine de yeni nokta eklemek istiyor musunuz?`,
        );
        setWarnOpen(true);
      } else {
        setPendingCoord(coord4326);
        setModalOpen(true);
      }
    };

    map.on('singleclick', onClick);
    return () => {
      map.un('singleclick', onClick);
      viewport.style.cursor = prevCursor;
    };
  }, [map, activeMode]);

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

  const handleCreated = (dto) => {
    vectorSourceRef.current?.addFeature(dtoToFeature(dto));
    pointsDataRef.current = [...pointsDataRef.current, dto];
    onModeConsumed?.();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPendingCoord(null);
  };

  const upsertPointOnMap = (dto) => {
    const source = vectorSourceRef.current;
    if (!source) return;
    const existing = source.getFeatureById(dto.id);
    if (existing) source.removeFeature(existing);
    source.addFeature(dtoToFeature(dto));
    const idx = pointsDataRef.current.findIndex((p) => p.id === dto.id);
    if (idx >= 0) {
      pointsDataRef.current = [
        ...pointsDataRef.current.slice(0, idx),
        dto,
        ...pointsDataRef.current.slice(idx + 1),
      ];
    } else {
      pointsDataRef.current = [...pointsDataRef.current, dto];
    }
    map?.getLayers().getArray().find((l) => l.get('title') === 'Noktalar')?.changed();
  };

  const handlePointUpdated = (dto) => {
    upsertPointOnMap(dto);
    setSelectedPoint(dto);
    handlePointSelect(dto);
  };

  const handlePointDeleted = (id) => {
    const source = vectorSourceRef.current;
    const existing = source?.getFeatureById(id);
    if (existing) source.removeFeature(existing);
    pointsDataRef.current = pointsDataRef.current.filter((p) => p.id !== id);
    highlightSourceRef.current?.clear();
    setDetailOpen(false);
    setSelectedPoint(null);
  };

  const spatialHint = spatialMode ? SPATIAL_HINTS[spatialMode] : null;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box
        ref={mapContainerRef}
        className="map-container"
        sx={{ width: '100%', height: '100%', minHeight: 0, userSelect: 'none' }}
      />

      <CoordinateBox pointerCoord={pointerCoord} clickCoord={clickCoord} />
      <LayersPanel
        map={map}
        open={layersPanelOpen}
        onOpenChange={setLayersPanelOpen}
      />
      <CategoryLegend visible={loggedIn} categories={categories} />

      {spatialOpen && (
        <SpatialQueryToolbar
          onSelect={handleSpatialToolSelect}
          onClose={handleSpatialClose}
        />
      )}

      {spatialHint && (
        <Alert
          severity="info"
          onClose={() => setSpatialMode(null)}
          sx={{
            position: 'absolute',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            backgroundColor: 'rgba(255,255,255,0.96)',
            boxShadow: 2,
            maxWidth: '90vw',
          }}
        >
          {spatialHint}
        </Alert>
      )}

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
          Yeni nokta eklemek için haritaya tıklayın • İptal: Esc
        </Alert>
      )}

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

      <BufferDistanceDialog
        open={bufferDialogOpen}
        centerLabel={bufferCenterLabel}
        onConfirm={handleBufferConfirm}
        onCancel={handleBufferCancel}
      />

      <QueryPointsModal
        open={queryOpen}
        onClose={() => {
          setQueryOpen(false);
          setSpatialResults(null);
          setSpatialResultsTitle('Nokta Sorgulama');
          setSpatialResultsHint(null);
        }}
        onPointSelect={handlePointSelect}
        initialPoints={spatialResults}
        title={spatialResultsTitle}
        resultHint={spatialResultsHint}
      />

      <PointDetailPopup
        open={detailOpen}
        point={selectedPoint}
        categories={categories}
        onClose={() => {
          setDetailOpen(false);
          setSelectedPoint(null);
        }}
        onUpdated={handlePointUpdated}
        onDeleted={handlePointDeleted}
      />
    </Box>
  );
}

export default MapView;
