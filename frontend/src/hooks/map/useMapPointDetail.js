// Haritada tekil noktaya tıklama → detay popup
import { useCallback, useEffect, useRef, useState } from 'react';

export function useMapPointDetail(map, {
  activeMode,
  spatialMode,
  measureMode,
  loggedIn,
  highlightPoint,
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const selectedPointRef = useRef(null);
  selectedPointRef.current = selectedPoint;

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedPoint(null);
  }, []);

  const onEscapeDetail = useCallback(() => {
    if (detailOpen) {
      closeDetail();
      return true;
    }
    return false;
  }, [detailOpen, closeDetail]);

  const onPointRemoved = useCallback((id) => {
    if (selectedPointRef.current?.id === id) {
      closeDetail();
    }
  }, [closeDetail]);

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
      highlightPoint(data);
    };

    map.on('singleclick', onClick);
    return () => map.un('singleclick', onClick);
  }, [map, activeMode, spatialMode, measureMode, loggedIn, highlightPoint]);

  return {
    detailOpen,
    selectedPoint,
    setSelectedPoint,
    closeDetail,
    onEscapeDetail,
    onPointRemoved,
  };
}
