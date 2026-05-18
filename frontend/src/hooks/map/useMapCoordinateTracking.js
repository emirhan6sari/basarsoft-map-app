import { useEffect, useState } from 'react';
import { toLonLat } from 'ol/proj';

export function useMapCoordinateTracking(map) {
  const [pointerCoord, setPointerCoord] = useState(null);
  const [clickCoord, setClickCoord] = useState(null);

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

  return { pointerCoord, clickCoord };
}
