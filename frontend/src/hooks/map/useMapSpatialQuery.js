/**
 * Buffer, sürükleyerek kutu ve poligon çizimi ile nokta filtreleme.
 * Her mod kendi OpenLayers etkileşimini kurar; sonuçlar QueryPointsModal'a gider.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Feature from 'ol/Feature';
import { Circle as OlCircle, Polygon as OlPolygon } from 'ol/geom';
import { fromLonLat, toLonLat } from 'ol/proj';
import Draw from 'ol/interaction/Draw';
import DragBox from 'ol/interaction/DragBox';
import {
  filterPointsInBuffer,
  filterPointsInExtent,
  filterPointsInPolygon,
  mercatorRadiusForMeters,
  extentToPolygonCoords,
} from '../../utils/spatialQuery';
import { hasActiveDrawSketch } from '../../utils/mapFeatureUtils';

export function useMapSpatialQuery(map, loggedIn, {
  querySourceRef,
  pointsDataRef,
  highlightMultiple,
  drawInteractionRef,
}) {
  const [spatialOpen, setSpatialOpen] = useState(false);
  const [spatialMode, setSpatialMode] = useState(null);
  const [bufferDialogOpen, setBufferDialogOpen] = useState(false);
  const [bufferCenter, setBufferCenter] = useState(null);
  const [bufferCenterLabel, setBufferCenterLabel] = useState('');
  const [spatialResults, setSpatialResults] = useState(null);
  const [spatialResultsTitle, setSpatialResultsTitle] = useState('Nokta Sorgulama');
  const [spatialResultsHint, setSpatialResultsHint] = useState(null);
  const [queryOpen, setQueryOpen] = useState(false);

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
    querySourceRef.current?.clear();
    highlightMultiple([]);
  }, [querySourceRef, highlightMultiple]);

  const handleSpatialToolSelect = useCallback((mode) => {
    querySourceRef.current?.clear();
    highlightMultiple([]);
    setSpatialMode(mode);
    setBufferDialogOpen(false);
    setBufferCenter(null);
  }, [querySourceRef, highlightMultiple]);

  const cancelSpatialTool = useCallback(() => {
    setSpatialMode(null);
    setBufferDialogOpen(false);
    setBufferCenter(null);
    querySourceRef.current?.clear();
    highlightMultiple([]);
  }, [querySourceRef, highlightMultiple]);

  const handleBufferConfirm = useCallback((radiusM) => {
    setBufferDialogOpen(false);
    if (!bufferCenter || !querySourceRef.current) return;

    const center3857 = fromLonLat([bufferCenter.longitude, bufferCenter.latitude]);
    const visualRadius = mercatorRadiusForMeters(bufferCenter.latitude, radiusM);
    querySourceRef.current.clear();
    querySourceRef.current.addFeature(new Feature({
      geometry: new OlCircle(center3857, visualRadius),
    }));

    const found = filterPointsInBuffer(pointsDataRef.current, bufferCenter, radiusM);
    highlightMultiple(found);
    openSpatialResults(found, 'Buffer Sorgusu', `${found.length} nokta — ${radiusM} m yarıçap`);
    setBufferCenter(null);
  }, [bufferCenter, querySourceRef, pointsDataRef, highlightMultiple, openSpatialResults]);

  const handleBufferCancel = useCallback(() => {
    setBufferDialogOpen(false);
    setBufferCenter(null);
  }, []);

  const onEscapeSpatial = useCallback(() => {
    if (bufferDialogOpen) {
      setBufferDialogOpen(false);
      setBufferCenter(null);
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
    return false;
  }, [
    bufferDialogOpen,
    spatialMode,
    spatialOpen,
    cancelSpatialTool,
    handleSpatialClose,
    drawInteractionRef,
  ]);

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
        setBufferCenter({ longitude: lon, latitude: lat });
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
  }, [
    map,
    spatialMode,
    loggedIn,
    querySourceRef,
    pointsDataRef,
    highlightMultiple,
    openSpatialResults,
    drawInteractionRef,
  ]);

  const openQueryFromMenu = useCallback(() => {
    setSpatialResults(null);
    setSpatialResultsTitle('Nokta Sorgulama');
    setSpatialResultsHint(null);
    setQueryOpen(true);
  }, []);

  const closeQueryModal = useCallback(() => {
    setQueryOpen(false);
    setSpatialResults(null);
    setSpatialResultsTitle('Nokta Sorgulama');
    setSpatialResultsHint(null);
  }, []);

  const onEscapeQueryModal = useCallback(() => {
    if (queryOpen) {
      closeQueryModal();
      return true;
    }
    return false;
  }, [queryOpen, closeQueryModal]);

  return {
    spatialOpen,
    setSpatialOpen,
    spatialMode,
    setSpatialMode,
    bufferDialogOpen,
    bufferCenterLabel,
    spatialResults,
    spatialResultsTitle,
    spatialResultsHint,
    queryOpen,
    setQueryOpen,
    handleSpatialClose,
    handleSpatialToolSelect,
    cancelSpatialTool,
    handleBufferConfirm,
    handleBufferCancel,
    closeQueryModal,
    onEscapeSpatial,
    onEscapeQueryModal,
    openQueryFromMenu,
  };
}
