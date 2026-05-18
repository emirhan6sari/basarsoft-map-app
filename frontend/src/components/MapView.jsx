/** Ana harita ekranı — OL örneği burada, davranış hook'larda toplanır. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { fromLonLat } from 'ol/proj';

import { useOpenLayersMap } from '../hooks/useOpenLayersMap';
import { useMapPointHistory } from '../hooks/useMapPointHistory';
import { useMapPointLayers } from '../hooks/map/useMapPointLayers';
import { useMapCategories } from '../hooks/map/useMapCategories';
import { useMapBboxLoader } from '../hooks/map/useMapBboxLoader';
import { useMapCoordinateTracking } from '../hooks/map/useMapCoordinateTracking';
import { useMapZoomLevel } from '../hooks/map/useMapZoomLevel';
import { useMapSpatialQuery } from '../hooks/map/useMapSpatialQuery';
import { useMapMeasurement } from '../hooks/map/useMapMeasurement';
import { useMapAddPointMode } from '../hooks/map/useMapAddPointMode';
import { useMapPointDetail } from '../hooks/map/useMapPointDetail';
import { useMapActiveMode } from '../hooks/map/useMapActiveMode';
import { useMapEscapeKey } from '../hooks/map/useMapEscapeKey';
import { useMapHistoryKeyboard } from '../hooks/map/useMapHistoryKeyboard';
import MapViewOverlays from './map/MapViewOverlays';
import { isAuthenticated } from '../api/auth';

function MapView({ activeMode, onModeConsumed }) {
  const mapContainerRef = useRef(null);
  const { map } = useOpenLayersMap(mapContainerRef);
  const drawInteractionRef = useRef(null);

  const [loggedIn, setLoggedIn] = useState(() => isAuthenticated());
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [categoryManageOpen, setCategoryManageOpen] = useState(false);

  const layers = useMapPointLayers(map);
  const {
    vectorSourceRef,
    clusterSourceRef,
    pointsDataRef,
    upsertPointOnMap,
    replaceAllPointsOnMap,
    removePointFromMap,
    highlightMultiple,
    highlightPoint,
  } = layers;

  const { categories, reloadCategories } = useMapCategories(loggedIn);
  const { pointsLoading, pointsLoadMeta, setPointsLoadMeta } = useMapBboxLoader(
    map,
    loggedIn,
    { replaceAllPointsOnMap, clusterSourceRef },
  );

  const { pointerCoord, clickCoord } = useMapCoordinateTracking(map);
  const mapZoom = useMapZoomLevel(map);

  const spatial = useMapSpatialQuery(map, loggedIn, {
    querySourceRef: layers.querySourceRef,
    pointsDataRef,
    highlightMultiple,
    drawInteractionRef,
  });

  const measure = useMapMeasurement(map);

  const pointDetail = useMapPointDetail(map, {
    activeMode,
    spatialMode: spatial.spatialMode,
    measureMode: measure.measureMode,
    loggedIn,
    highlightPoint,
  });

  const selectedPointIdRef = useRef(null);
  useEffect(() => {
    selectedPointIdRef.current = pointDetail.selectedPoint?.id ?? null;
  }, [pointDetail.selectedPoint]);

  const addPoint = useMapAddPointMode(map, activeMode, {
    vectorSourceRef,
    onModeConsumed,
  });

  const handleHistorySync = useCallback((event) => {
    if (event.op === 'add' || event.op === 'update') {
      upsertPointOnMap(event.point);
      if (selectedPointIdRef.current === event.point.id) {
        pointDetail.setSelectedPoint(event.point);
      }
    } else if (event.op === 'remove') {
      removePointFromMap(event.id);
      pointDetail.onPointRemoved(event.id);
    } else if (event.op === 'batchAdd') {
      event.points.forEach((p) => upsertPointOnMap(p));
    } else if (event.op === 'batchRemove') {
      event.ids.forEach((id) => {
        removePointFromMap(id);
        pointDetail.onPointRemoved(id);
      });
    }
  }, [upsertPointOnMap, removePointFromMap, pointDetail.setSelectedPoint, pointDetail.onPointRemoved]);

  const history = useMapPointHistory({ onSync: handleHistorySync });
  const {
    historyError,
    setHistoryError,
    handleHistoryUndo,
    handleHistoryRedo,
  } = useMapHistoryKeyboard(loggedIn, history);

  useEffect(() => {
    const onSessionExpired = () => {
      setLoggedIn(false);
      replaceAllPointsOnMap([]);
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, [replaceAllPointsOnMap]);

  const activeModeHandlers = useMemo(() => ({
    queryPoints: spatial.openQueryFromMenu,
    spatial: () => spatial.setSpatialOpen(true),
    layers: () => setLayersPanelOpen(true),
    import: () => setImportModalOpen(true),
    measure: () => measure.setMeasureOpen(true),
    categories: () => setCategoryManageOpen(true),
  }), [spatial, measure]);

  useMapActiveMode(activeMode, onModeConsumed, activeModeHandlers);

  const escapeHandlers = useMemo(() => [
    spatial.onEscapeSpatial,
    () => {
      if (importModalOpen) {
        setImportModalOpen(false);
        return true;
      }
      return false;
    },
    addPoint.onEscapeAddPoint,
    spatial.onEscapeQueryModal,
    pointDetail.onEscapeDetail,
    measure.onEscapeMeasure,
  ], [
    spatial,
    importModalOpen,
    addPoint.onEscapeAddPoint,
    pointDetail.onEscapeDetail,
    measure.onEscapeMeasure,
  ]);

  useMapEscapeKey(escapeHandlers);

  const handleCreated = useCallback((dto) => {
    upsertPointOnMap(dto);
    history.recordCreate(dto);
    onModeConsumed?.();
  }, [upsertPointOnMap, history, onModeConsumed]);

  const handleImported = useCallback((result) => {
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
  }, [upsertPointOnMap, history, map]);

  const handlePointUpdated = useCallback((dto, previous) => {
    if (previous) history.recordUpdate(previous, dto);
    upsertPointOnMap(dto);
    pointDetail.setSelectedPoint(dto);
    highlightPoint(dto);
  }, [history, upsertPointOnMap, pointDetail, highlightPoint]);

  const handlePointDeleted = useCallback((id, snapshot) => {
    if (snapshot) history.recordDelete(snapshot);
    removePointFromMap(id);
    pointDetail.onPointRemoved(id);
  }, [history, removePointFromMap, pointDetail]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box
        ref={mapContainerRef}
        className="map-container"
        sx={{ width: '100%', height: '100%', minHeight: 0, userSelect: 'none' }}
      />

      <MapViewOverlays
        map={map}
        mapZoom={mapZoom}
        pointerCoord={pointerCoord}
        clickCoord={clickCoord}
        loggedIn={loggedIn}
        categories={categories}
        reloadCategories={reloadCategories}
        layersPanelOpen={layersPanelOpen}
        setLayersPanelOpen={setLayersPanelOpen}
        pointsLoading={pointsLoading}
        pointsLoadMeta={pointsLoadMeta}
        setPointsLoadMeta={setPointsLoadMeta}
        history={history}
        historyError={historyError}
        setHistoryError={setHistoryError}
        onHistoryUndo={handleHistoryUndo}
        onHistoryRedo={handleHistoryRedo}
        spatialOpen={spatial.spatialOpen}
        spatialMode={spatial.spatialMode}
        onSpatialToolSelect={spatial.handleSpatialToolSelect}
        onSpatialClose={spatial.handleSpatialClose}
        measureOpen={measure.measureOpen}
        measureMode={measure.measureMode}
        measureLive={measure.measureLive}
        measureResult={measure.measureResult}
        measureFeatureCount={measure.measureFeatureCount}
        onMeasureToolSelect={measure.handleMeasureToolSelect}
        onMeasureClose={measure.handleMeasureClose}
        onMeasureClear={measure.clearMeasureLayer}
        onCancelMeasureTool={measure.cancelMeasureTool}
        activeMode={activeMode}
        modalOpen={addPoint.modalOpen}
        warnOpen={addPoint.warnOpen}
        warnText={addPoint.warnText}
        pendingCoord={addPoint.pendingCoord}
        confirmProximityForAdd={addPoint.confirmProximityForAdd}
        onWarnConfirm={addPoint.handleWarnConfirm}
        onWarnCancel={addPoint.handleWarnCancel}
        onAddPointClose={addPoint.handleModalClose}
        onAddPointCreated={handleCreated}
        importModalOpen={importModalOpen}
        onImportClose={() => setImportModalOpen(false)}
        onImported={handleImported}
        categoryManageOpen={categoryManageOpen}
        onCategoryManageClose={() => setCategoryManageOpen(false)}
        bufferDialogOpen={spatial.bufferDialogOpen}
        bufferCenterLabel={spatial.bufferCenterLabel}
        onBufferConfirm={spatial.handleBufferConfirm}
        onBufferCancel={spatial.handleBufferCancel}
        queryOpen={spatial.queryOpen}
        onQueryClose={spatial.closeQueryModal}
        onPointSelect={highlightPoint}
        spatialResults={spatial.spatialResults}
        spatialResultsTitle={spatial.spatialResultsTitle}
        spatialResultsHint={spatial.spatialResultsHint}
        detailOpen={pointDetail.detailOpen}
        selectedPoint={pointDetail.selectedPoint}
        onDetailClose={pointDetail.closeDetail}
        onDetailUpdated={(dto) => handlePointUpdated(dto, pointDetail.selectedPoint)}
        onDetailDeleted={(id) => handlePointDeleted(id, pointDetail.selectedPoint)}
        onModeConsumed={onModeConsumed}
        onSpatialHintClose={() => spatial.setSpatialMode(null)}
      />
    </Box>
  );
}

export default MapView;
