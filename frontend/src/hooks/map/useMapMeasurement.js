/** Çizgi veya poligon çizerek uzunluk / alan ölçümü (EPSG:3857 metre). */
import { useCallback, useEffect, useRef, useState } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import { unByKey } from 'ol/Observable';
import { createMeasureStyleFunction } from '../../utils/measureStyles';
import { measureGeometry } from '../../utils/measureFormat';
import { hasActiveDrawSketch } from '../../utils/mapFeatureUtils';

export function useMapMeasurement(map) {
  const measureSourceRef = useRef(null);
  const measureDrawInteractionRef = useRef(null);

  const [measureOpen, setMeasureOpen] = useState(false);
  const [measureMode, setMeasureMode] = useState(null);
  const [measureLive, setMeasureLive] = useState(null);
  const [measureResult, setMeasureResult] = useState(null);
  const [measureFeatureCount, setMeasureFeatureCount] = useState(0);

  const syncMeasureFeatureCount = useCallback(() => {
    setMeasureFeatureCount(measureSourceRef.current?.getFeatures().length ?? 0);
  }, []);

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

  const onEscapeMeasure = useCallback(() => {
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
    return false;
  }, [measureMode, measureOpen, cancelMeasureTool, handleMeasureClose]);

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
      setMeasureResult(measureGeometry(evt.feature.getGeometry()));
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

  return {
    measureOpen,
    setMeasureOpen,
    measureMode,
    measureLive,
    measureResult,
    measureFeatureCount,
    handleMeasureClose,
    handleMeasureToolSelect,
    cancelMeasureTool,
    clearMeasureLayer,
    onEscapeMeasure,
  };
}
