import { useEffect, useState } from 'react';

export function useMapZoomLevel(map) {
  const [mapZoom, setMapZoom] = useState(null);

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

  return mapZoom;
}
