/** Haritaya tıklayınca form; API ile aynı yakınlık eşiğinde isteğe bağlı onay. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { coordinateSetFrom3857 } from '../../utils/coordinateTransform';
import { findNearbyPoint } from '../../utils/mapFeatureUtils';

export function useMapAddPointMode(map, activeMode, { vectorSourceRef, onModeConsumed }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCoord, setPendingCoord] = useState(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnText, setWarnText] = useState('');
  const [confirmProximityForAdd, setConfirmProximityForAdd] = useState(false);
  const pendingAfterWarnRef = useRef(null);

  const handleWarnConfirm = useCallback(() => {
    setWarnOpen(false);
    setConfirmProximityForAdd(true);
    setPendingCoord(pendingAfterWarnRef.current);
    setModalOpen(true);
    pendingAfterWarnRef.current = null;
  }, []);

  const handleWarnCancel = useCallback(() => {
    setWarnOpen(false);
    pendingAfterWarnRef.current = null;
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setPendingCoord(null);
    setConfirmProximityForAdd(false);
  }, []);

  const onEscapeAddPoint = useCallback(() => {
    if (modalOpen) {
      handleModalClose();
      return true;
    }
    if (warnOpen) {
      setWarnOpen(false);
      pendingAfterWarnRef.current = null;
      return true;
    }
    if (activeMode === 'addPoint') {
      onModeConsumed?.();
      return true;
    }
    return false;
  }, [modalOpen, warnOpen, activeMode, handleModalClose, onModeConsumed]);

  useEffect(() => {
    if (!map || activeMode !== 'addPoint') return;

    const viewport = map.getViewport();
    const prevCursor = viewport.style.cursor;
    viewport.style.cursor = 'crosshair';

    const onClick = (e) => {
      if (e.originalEvent?.defaultPrevented) return;
      const [xMercator, yMercator] = e.coordinate;
      const coord4326 = coordinateSetFrom3857(xMercator, yMercator);
      const nearby = findNearbyPoint(vectorSourceRef.current, e.coordinate);

      if (nearby) {
        pendingAfterWarnRef.current = coord4326;
        setWarnText(
          `"${nearby.name}" noktasına yaklaşık ${nearby.distanceM} m uzaklıkta ` +
          `zaten bir nokta var. Yine de yeni nokta eklemek istiyor musunuz?`,
        );
        setWarnOpen(true);
      } else {
        setConfirmProximityForAdd(false);
        setPendingCoord(coord4326);
        setModalOpen(true);
      }
    };

    map.on('singleclick', onClick);
    return () => {
      map.un('singleclick', onClick);
      viewport.style.cursor = prevCursor;
    };
  }, [map, activeMode, vectorSourceRef]);

  return {
    modalOpen,
    pendingCoord,
    warnOpen,
    warnText,
    confirmProximityForAdd,
    handleWarnConfirm,
    handleWarnCancel,
    handleModalClose,
    onEscapeAddPoint,
  };
}
