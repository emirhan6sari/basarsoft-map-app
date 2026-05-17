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
import MapZoomLabel from './MapZoomLabel';
import LayersPanel from './LayersPanel';
import AddPointModal from './AddPointModal';
import ImportGeometryModal from './ImportGeometryModal';
import QueryPointsModal from './QueryPointsModal';
import PointDetailPopup from './PointDetailPopup';
import CategoryLegend from './CategoryLegend';
import SpatialQueryToolbar from './SpatialQueryToolbar';
import MeasurementToolbar from './MeasurementToolbar';
import MeasurementResultPanel from './MeasurementResultPanel';
import UndoRedoControls from './UndoRedoControls';
import BufferDistanceDialog from './BufferDistanceDialog';
import { useMapPointHistory } from '../hooks/useMapPointHistory';
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
import { createMeasureStyleFunction } from '../utils/measureStyles';
import { measureGeometry } from '../utils/measureFormat';
import { bboxFromMap } from '../utils/mapBbox';
import {
  MIN_ZOOM_FOR_POINT_LOAD,
  resolveBboxLoadLimit,
  resolveClusterDistance,
} from '../utils/mapPerformance';
import { unByKey } from 'ol/Observable';

const BBOX_RELOAD_DEBOUNCE_MS = 350;

const PROXIMITY_THRESHOLD_M = 50;

const SPATIAL_HINTS = {
  spatialBuffer: 'Buffer merkezi için haritaya tıklayın • İptal: Esc',
  spatialBox: 'Dikdörtgen alan çizmek için sürükleyin • İptal: Esc',
  spatialPolygon: 'Poligon çizmek için tıklayın; bitirmek için çift tıklayın • İptal: Esc',
};

const MEASURE_HINTS = {
  measureLength: 'Uzunluk için çizgi çizin; bitirmek için çift tıklayın • Esc: iptal',
  measureArea: 'Alan için poligon çizin; bitirmek için çift tıklayın • Esc: iptal',
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
  const clusterSourceRef = useRef(null);
  const highlightSourceRef = useRef(null);
  const querySourceRef = useRef(null);
  const measureSourceRef = useRef(null);
  const pointsDataRef = useRef([]);
  const drawInteractionRef = useRef(null);
  const measureDrawInteractionRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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

  const [measureOpen, setMeasureOpen] = useState(false);
  const [measureMode, setMeasureMode] = useState(null);
  const [measureLive, setMeasureLive] = useState(null);
  const [measureResult, setMeasureResult] = useState(null);
  const [measureFeatureCount, setMeasureFeatureCount] = useState(0);
  const [historyError, setHistoryError] = useState(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsLoadMeta, setPointsLoadMeta] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);

  const selectedPointRef = useRef(null);
  selectedPointRef.current = selectedPoint;

  const upsertPointOnMap = useCallback((dto) => {
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
  }, [map]);

  const replaceAllPointsOnMap = useCallback((list) => {
    const source = vectorSourceRef.current;
    if (!source) return;
    source.clear();
    const dtos = list ?? [];
    source.addFeatures(dtos.map(dtoToFeature));
    pointsDataRef.current = dtos;
    map?.getLayers().getArray().find((l) => l.get('title') === 'Noktalar')?.changed();
  }, [map]);

  const removePointFromMap = useCallback((id) => {
    const source = vectorSourceRef.current;
    const existing = source?.getFeatureById(id);
    if (existing) source.removeFeature(existing);
    pointsDataRef.current = pointsDataRef.current.filter((p) => p.id !== id);
    highlightSourceRef.current?.clear();
    if (selectedPointRef.current?.id === id) {
      setDetailOpen(false);
      setSelectedPoint(null);
    }
    map?.getLayers().getArray().find((l) => l.get('title') === 'Noktalar')?.changed();
  }, [map]);

  const handleHistorySync = useCallback((event) => {
    if (event.op === 'add' || event.op === 'update') {
      upsertPointOnMap(event.point);
      if (selectedPointRef.current?.id === event.point.id) {
        setSelectedPoint(event.point);
      }
    } else if (event.op === 'remove') {
      removePointFromMap(event.id);
    } else if (event.op === 'batchAdd') {
      event.points.forEach((p) => upsertPointOnMap(p));
    } else if (event.op === 'batchRemove') {
      event.ids.forEach((id) => removePointFromMap(id));
    }
  }, [upsertPointOnMap, removePointFromMap]);

  const history = useMapPointHistory({ onSync: handleHistorySync });

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

  const clearMeasureLayer = useCallback(() => {
    measureSourceRef.current?.clear();
    setMeasureFeatureCount(0);
    setMeasureLive(null);
    setMeasureResult(null);
  }, []);

  const handleMeasureClose = useCallback(() => {
    setMeasureOpen(false);
    setMeasureMode(null);
    setMeasureLive(null);
  }, []);

  const handleMeasureToolSelect = useCallback((mode) => {
    setMeasureMode(mode);
    setMeasureLive(null);
  }, []);

  const cancelMeasureTool = useCallback(() => {
    setMeasureMode(null);
    setMeasureLive(null);
  }, []);

  const syncMeasureFeatureCount = useCallback(() => {
    setMeasureFeatureCount(measureSourceRef.current?.getFeatures().length ?? 0);
  }, []);

  const cancelCurrentOperation = useCallback(() => {
    if (bufferDialogOpen) {
      setBufferDialogOpen(false);
      setBufferCenter(null);
      return true;
    }
    if (importModalOpen) {
      setImportModalOpen(false);
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
    if (measureMode && measureDrawInteractionRef.current) {
      const draw = measureDrawInteractionRef.current;
      if (hasActiveDrawSketch(draw)) {
        draw.abortDrawing();
        return true;
      }
    }
    if (measureMode) {
      cancelMeasureTool();
      return true;
    }
    if (measureOpen) {
      handleMeasureClose();
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
    importModalOpen,
    modalOpen,
    warnOpen,
    queryOpen,
    detailOpen,
    measureMode,
    measureOpen,
    spatialMode,
    spatialOpen,
    activeMode,
    cancelMeasureTool,
    handleMeasureClose,
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
  // Undo / Redo — Ctrl+Z / Ctrl+Y
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!loggedIn) return;

    const onKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const isRedo = e.key === 'y' || (e.key === 'z' && e.shiftKey);
      const isUndo = e.key === 'z' && !e.shiftKey;
      if (!isUndo && !isRedo) return;

      e.preventDefault();
      setHistoryError(null);
      const action = isRedo ? history.redo : history.undo;
      action().catch((err) => setHistoryError(err.message ?? 'İşlem uygulanamadı.'));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loggedIn, history.undo, history.redo]);

  const handleHistoryUndo = () => {
    setHistoryError(null);
    history.undo().catch((err) => setHistoryError(err.message ?? 'Geri alınamadı.'));
  };

  const handleHistoryRedo = () => {
    setHistoryError(null);
    history.redo().catch((err) => setHistoryError(err.message ?? 'Yineleme başarısız.'));
  };

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
    clusterSourceRef.current = clusterSource;

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

    setLoggedIn(isAuthenticated());
    if (!isAuthenticated()) {
      pointsDataRef.current = [];
    }

    return () => {
      map.removeLayer(pointsLayer);
      map.removeLayer(hlLayer);
      map.removeLayer(queryLayer);
      vectorSourceRef.current = null;
      clusterSourceRef.current = null;
      highlightSourceRef.current = null;
      querySourceRef.current = null;
      pointsDataRef.current = [];
    };
  }, [map]);

  useEffect(() => {
    const onSessionExpired = () => {
      setLoggedIn(false);
      pointsDataRef.current = [];
      replaceAllPointsOnMap([]);
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, [replaceAllPointsOnMap]);

  // -------------------------------------------------------------------
  // Kategoriler (bir kez)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    fetchCategories()
      .then((cats) => {
        if (cancelled) return;
        const categoryList = cats ?? [];
        registerCategories(categoryList);
        setCategories(categoryList);
      })
      .catch((err) => console.error('Kategoriler yüklenemedi:', err));
    return () => { cancelled = true; };
  }, [loggedIn]);

  // -------------------------------------------------------------------
  // Bbox ile nokta yükleme (moveend + debounce)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || !loggedIn) return;

    let debounceTimer = null;
    let abortController = null;

    const reloadPoints = () => {
      const bbox = bboxFromMap(map);
      if (!bbox) return;

      const zoom = map.getView().getZoom() ?? 0;
      const loadLimit = resolveBboxLoadLimit(zoom);

      if (loadLimit === 0) {
        if (abortController) abortController.abort();
        replaceAllPointsOnMap([]);
        setPointsLoadMeta({ type: 'zoom', minZoom: MIN_ZOOM_FOR_POINT_LOAD });
        setPointsLoading(false);
        return;
      }

      if (abortController) abortController.abort();
      abortController = new AbortController();

      setPointsLoading(true);
      listMapPoints(bbox, { signal: abortController.signal, limit: loadLimit })
        .then((result) => {
          if (abortController?.signal.aborted) return;
          const items = result?.items ?? [];
          replaceAllPointsOnMap(items);

          const cluster = clusterSourceRef.current;
          if (cluster) {
            cluster.setDistance(resolveClusterDistance(zoom, items.length));
          }

          if (result?.truncated) {
            setPointsLoadMeta({
              type: 'truncated',
              returnedCount: result.returnedCount,
              totalCount: result.totalCount,
              maxResults: result.maxResults,
            });
          } else {
            setPointsLoadMeta(null);
          }
        })
        .catch((err) => {
          if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
          console.error('Harita noktaları yüklenemedi:', err);
        })
        .finally(() => {
          if (!abortController?.signal.aborted) setPointsLoading(false);
        });
    };

    const scheduleReload = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(reloadPoints, BBOX_RELOAD_DEBOUNCE_MS);
    };

    reloadPoints();
    map.on('moveend', scheduleReload);

    return () => {
      window.clearTimeout(debounceTimer);
      if (abortController) abortController.abort();
      map.un('moveend', scheduleReload);
    };
  }, [map, loggedIn, replaceAllPointsOnMap]);

  // -------------------------------------------------------------------
  // Zoom seviyesi gösterimi (+/- yanında)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return;

    const syncZoom = () => setMapZoom(map.getView().getZoom() ?? 0);
    syncZoom();
    map.on('moveend', syncZoom);
    const view = map.getView();
    view.on('change:resolution', syncZoom);

    return () => {
      map.un('moveend', syncZoom);
      view.un('change:resolution', syncZoom);
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
    if (activeMode === 'import') {
      setImportModalOpen(true);
      onModeConsumed?.();
    }
    if (activeMode === 'measure') {
      setMeasureOpen(true);
      onModeConsumed?.();
    }
  }, [activeMode, onModeConsumed]);

  // -------------------------------------------------------------------
  // Noktaya tıklama → detay popup
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || activeMode === 'addPoint' || spatialMode || measureMode || !loggedIn) return;

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

  // -------------------------------------------------------------------
  // Ölçüm katmanı
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return;

    const measureSource = new VectorSource();
    measureSourceRef.current = measureSource;

    const measureLayer = new VectorLayer({
      source: measureSource,
      style: createMeasureStyleFunction(),
      zIndex: 8,
    });
    measureLayer.set('title', 'Ölçüm');
    map.addLayer(measureLayer);

    return () => {
      map.removeLayer(measureLayer);
      measureSourceRef.current = null;
    };
  }, [map]);

  // -------------------------------------------------------------------
  // Ölçüm çizim etkileşimi
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map || !measureMode) return;

    const source = measureSourceRef.current;
    if (!source) return;

    const drawType = measureMode === 'measureLength' ? 'LineString' : 'Polygon';
    const draw = new Draw({ source, type: drawType });
    measureDrawInteractionRef.current = draw;

    let geomListenerKey = null;

    const onGeomChange = (geometry) => {
      setMeasureLive(measureGeometry(geometry));
    };

    draw.on('drawstart', (evt) => {
      const geometry = evt.feature.getGeometry();
      onGeomChange(geometry);
      geomListenerKey = geometry.on('change', () => onGeomChange(geometry));
    });

    draw.on('drawend', (evt) => {
      if (geomListenerKey) {
        unByKey(geomListenerKey);
        geomListenerKey = null;
      }
      const measured = measureGeometry(evt.feature.getGeometry());
      setMeasureResult(measured);
      setMeasureLive(null);
      syncMeasureFeatureCount();
    });

    draw.on('drawabort', () => {
      if (geomListenerKey) {
        unByKey(geomListenerKey);
        geomListenerKey = null;
      }
      setMeasureLive(null);
    });

    const viewport = map.getViewport();
    const prevCursor = viewport.style.cursor;
    viewport.style.cursor = 'crosshair';
    map.addInteraction(draw);

    return () => {
      measureDrawInteractionRef.current = null;
      if (geomListenerKey) unByKey(geomListenerKey);
      viewport.style.cursor = prevCursor;
      map.removeInteraction(draw);
    };
  }, [map, measureMode, syncMeasureFeatureCount]);

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
    upsertPointOnMap(dto);
    history.recordCreate(dto);
    onModeConsumed?.();
  };

  const handleImported = (result) => {
    const list = result?.created ?? [];
    if (!list.length) return;

    list.forEach((dto) => upsertPointOnMap(dto));
    history.recordBatchCreate(list);

    if (map && list.length > 0) {
      const coords = list.map((d) => fromLonLat([d.longitude, d.latitude]));
      const xs = coords.map((c) => c[0]);
      const ys = coords.map((c) => c[1]);
      const pad = 8000;
      const extent = [
        Math.min(...xs) - pad,
        Math.min(...ys) - pad,
        Math.max(...xs) + pad,
        Math.max(...ys) + pad,
      ];
      map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 14, duration: 500 });
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPendingCoord(null);
  };

  const handlePointUpdated = (dto, previous) => {
    if (previous) history.recordUpdate(previous, dto);
    upsertPointOnMap(dto);
    setSelectedPoint(dto);
    handlePointSelect(dto);
  };

  const handlePointDeleted = (id, snapshot) => {
    if (snapshot) history.recordDelete(snapshot);
    removePointFromMap(id);
  };

  const spatialHint = spatialMode ? SPATIAL_HINTS[spatialMode] : null;
  const measureHint = measureMode ? MEASURE_HINTS[measureMode] : null;
  const showZoomHint = loggedIn && pointsLoadMeta?.type === 'zoom' && !pointsLoading;
  const categoryLegendTop = showZoomHint ? 118 : 72;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box
        ref={mapContainerRef}
        className="map-container"
        sx={{ width: '100%', height: '100%', minHeight: 0, userSelect: 'none' }}
      />

      <CoordinateBox pointerCoord={pointerCoord} clickCoord={clickCoord} />
      {map && <MapZoomLabel zoom={mapZoom} />}
      <LayersPanel
        map={map}
        open={layersPanelOpen}
        onOpenChange={setLayersPanelOpen}
      />
      {showZoomHint && (
        <Alert
          severity="warning"
          sx={{
            position: 'absolute',
            top: 52,
            left: 12,
            zIndex: 1002,
            maxWidth: 300,
            backgroundColor: 'rgba(255,255,255,0.96)',
            boxShadow: 2,
          }}
        >
          Noktaları görmek için haritayı yakınlaştırın (zoom ≥ {pointsLoadMeta.minZoom}).
        </Alert>
      )}

      <CategoryLegend visible={loggedIn} categories={categories} top={categoryLegendTop} />

      {loggedIn && pointsLoading && (
        <Alert
          severity="info"
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1090,
            py: 0.25,
            backgroundColor: 'rgba(255,255,255,0.92)',
          }}
        >
          Noktalar yükleniyor…
        </Alert>
      )}

      {loggedIn && pointsLoadMeta?.type === 'truncated' && !pointsLoading && (
        <Alert
          severity="warning"
          onClose={() => setPointsLoadMeta(null)}
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1090,
            maxWidth: '92vw',
            backgroundColor: 'rgba(255,255,255,0.94)',
          }}
        >
          Bu alanda {pointsLoadMeta.totalCount.toLocaleString('tr-TR')} nokta var;{' '}
          {pointsLoadMeta.returnedCount.toLocaleString('tr-TR')} tanesi gösteriliyor (limit:{' '}
          {pointsLoadMeta.maxResults.toLocaleString('tr-TR')}). Daha fazlası için yakınlaştırın.
        </Alert>
      )}

      {loggedIn && (
        <UndoRedoControls
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          busy={history.busy}
          onUndo={handleHistoryUndo}
          onRedo={handleHistoryRedo}
        />
      )}

      {historyError && (
        <Alert
          severity="warning"
          onClose={() => setHistoryError(null)}
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 12,
            zIndex: 1100,
            maxWidth: 320,
          }}
        >
          {historyError}
        </Alert>
      )}

      {spatialOpen && (
        <SpatialQueryToolbar
          onSelect={handleSpatialToolSelect}
          onClose={handleSpatialClose}
        />
      )}

      {measureOpen && (
        <MeasurementToolbar
          onSelect={handleMeasureToolSelect}
          onClose={handleMeasureClose}
          onClear={clearMeasureLayer}
          featureCount={measureFeatureCount}
        />
      )}

      <MeasurementResultPanel live={measureLive} result={measureResult} />

      {measureHint && (
        <Alert
          severity="info"
          onClose={() => cancelMeasureTool()}
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
          {measureHint}
        </Alert>
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

      <ImportGeometryModal
        open={importModalOpen}
        onImported={handleImported}
        onClose={() => setImportModalOpen(false)}
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
        bbox={spatialResults ? null : bboxFromMap(map)}
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
        onUpdated={(dto) => handlePointUpdated(dto, selectedPoint)}
        onDeleted={(id) => handlePointDeleted(id, selectedPoint)}
      />
    </Box>
  );
}

export default MapView;
