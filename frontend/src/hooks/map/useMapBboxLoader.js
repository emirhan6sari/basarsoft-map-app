/**
 * Harita hareket/zoom sonrası bbox ile nokta listesi çeker.
 * Önceki istek abort edilir; cluster mesafesi zoom'a göre ayarlanır.
 */
import { useEffect, useState } from 'react';
import { listMapPoints } from '../../api/mapPoints';
import { bboxFromMap } from '../../utils/mapBbox';
import { resolveBboxLoadLimit, resolveClusterDistance } from '../../utils/mapPerformance';
import { BBOX_RELOAD_DEBOUNCE_MS } from '../../utils/mapViewConstants';

export function useMapBboxLoader(map, loggedIn, { replaceAllPointsOnMap, clusterSourceRef }) {
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsLoadMeta, setPointsLoadMeta] = useState(null);

  useEffect(() => {
    if (!map || !loggedIn) return;

    let debounceTimer = null;
    let abortController = null;

    const reloadPoints = () => {
      const bbox = bboxFromMap(map);
      if (!bbox) return;

      const zoom = map.getView().getZoom() ?? 0;
      const loadLimit = resolveBboxLoadLimit(zoom);

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
  }, [map, loggedIn, replaceAllPointsOnMap, clusterSourceRef]);

  return { pointsLoading, pointsLoadMeta, setPointsLoadMeta };
}
