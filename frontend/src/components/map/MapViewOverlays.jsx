/** MapView: toolbar, modallar, legend — OpenLayers konteynerinin dışı. */
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

import CoordinateBox from '../CoordinateBox';
import MapZoomLabel from '../MapZoomLabel';
import LayersPanel from '../LayersPanel';
import CategoryLegend from '../CategoryLegend';
import SpatialQueryToolbar from '../SpatialQueryToolbar';
import MeasurementToolbar from '../MeasurementToolbar';
import MeasurementResultPanel from '../MeasurementResultPanel';
import UndoRedoControls from '../UndoRedoControls';
import AddPointModal from '../AddPointModal';
import ImportGeometryModal from '../ImportGeometryModal';
import CategoryManageModal from '../CategoryManageModal';
import BufferDistanceDialog from '../BufferDistanceDialog';
import QueryPointsModal from '../QueryPointsModal';
import PointDetailPopup from '../PointDetailPopup';
import { bboxFromMap } from '../../utils/mapBbox';
import { SPATIAL_HINTS, MEASURE_HINTS } from '../../utils/mapViewConstants';

export default function MapViewOverlays({
  map,
  mapZoom,
  pointerCoord,
  clickCoord,
  loggedIn,
  categories,
  reloadCategories,
  layersPanelOpen,
  setLayersPanelOpen,
  pointsLoading,
  pointsLoadMeta,
  setPointsLoadMeta,
  history,
  historyError,
  setHistoryError,
  onHistoryUndo,
  onHistoryRedo,
  spatialOpen,
  spatialMode,
  onSpatialToolSelect,
  onSpatialClose,
  measureOpen,
  measureMode,
  measureLive,
  measureResult,
  measureFeatureCount,
  onMeasureToolSelect,
  onMeasureClose,
  onMeasureClear,
  onCancelMeasureTool,
  activeMode,
  modalOpen,
  warnOpen,
  warnText,
  pendingCoord,
  confirmProximityForAdd,
  onWarnConfirm,
  onWarnCancel,
  onAddPointClose,
  onAddPointCreated,
  importModalOpen,
  onImportClose,
  onImported,
  categoryManageOpen,
  onCategoryManageClose,
  bufferDialogOpen,
  bufferCenterLabel,
  onBufferConfirm,
  onBufferCancel,
  queryOpen,
  onQueryClose,
  onPointSelect,
  spatialResults,
  spatialResultsTitle,
  spatialResultsHint,
  detailOpen,
  selectedPoint,
  onDetailClose,
  onDetailUpdated,
  onDetailDeleted,
  onModeConsumed,
  onSpatialHintClose,
}) {
  const spatialHint = spatialMode ? SPATIAL_HINTS[spatialMode] : null;
  const measureHint = measureMode ? MEASURE_HINTS[measureMode] : null;

  return (
    <>
      <CoordinateBox pointerCoord={pointerCoord} clickCoord={clickCoord} />
      {map && <MapZoomLabel zoom={mapZoom} />}
      <LayersPanel map={map} open={layersPanelOpen} onOpenChange={setLayersPanelOpen} />
      <CategoryLegend visible={loggedIn} categories={categories} top={72} />

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
          onUndo={onHistoryUndo}
          onRedo={onHistoryRedo}
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
        <SpatialQueryToolbar onSelect={onSpatialToolSelect} onClose={onSpatialClose} />
      )}

      {measureOpen && (
        <MeasurementToolbar
          onSelect={onMeasureToolSelect}
          onClose={onMeasureClose}
          onClear={onMeasureClear}
          featureCount={measureFeatureCount}
        />
      )}

      <MeasurementResultPanel live={measureLive} result={measureResult} />

      {measureHint && (
        <Alert
          severity="info"
          onClose={onCancelMeasureTool}
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
          onClose={onSpatialHintClose}
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

      <Dialog open={warnOpen} onClose={onWarnCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Yakın Nokta Uyarısı</DialogTitle>
        <DialogContent>
          <DialogContentText>{warnText}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onWarnCancel}>İptal</Button>
          <Button onClick={onWarnConfirm} variant="contained" color="warning">
            Yine de Ekle
          </Button>
        </DialogActions>
      </Dialog>

      <AddPointModal
        open={modalOpen}
        coordinate={pendingCoord}
        categories={categories}
        onRefreshCategories={reloadCategories}
        confirmProximityWarning={confirmProximityForAdd}
        onCreated={onAddPointCreated}
        onClose={onAddPointClose}
      />

      <ImportGeometryModal
        open={importModalOpen}
        categories={categories}
        onRefreshCategories={reloadCategories}
        onImported={onImported}
        onClose={onImportClose}
      />

      <CategoryManageModal
        open={categoryManageOpen}
        onClose={onCategoryManageClose}
        onChanged={reloadCategories}
      />

      <BufferDistanceDialog
        open={bufferDialogOpen}
        centerLabel={bufferCenterLabel}
        onConfirm={onBufferConfirm}
        onCancel={onBufferCancel}
      />

      <QueryPointsModal
        open={queryOpen}
        onClose={onQueryClose}
        onPointSelect={onPointSelect}
        initialPoints={spatialResults}
        bbox={spatialResults ? null : bboxFromMap(map)}
        title={spatialResultsTitle}
        resultHint={spatialResultsHint}
      />

      <PointDetailPopup
        open={detailOpen}
        point={selectedPoint}
        categories={categories}
        onClose={onDetailClose}
        onUpdated={onDetailUpdated}
        onDeleted={onDetailDeleted}
      />
    </>
  );
}
