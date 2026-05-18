/**
 * Cluster nokta katmanı, seçim vurgusu ve mekansal sorgu çizim kaynağı.
 * pointsDataRef — client-side filtreler için güncel DTO listesi.
 */
import { useCallback, useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import Feature from 'ol/Feature';
import { Point as OlPoint } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { setupAuxiliaryLayers } from '../../layers/setupAuxiliaryLayers';
import {
  CLUSTER_OPTIONS,
  HIGHLIGHT_STYLE,
  SPATIAL_QUERY_STYLE,
  createClusterStyleFunction,
} from '../../utils/mapPointStyles';
import { dtoToFeature } from '../../utils/mapFeatureUtils';
import { isAuthenticated } from '../../api/auth';

export function useMapPointLayers(map) {
  const vectorSourceRef = useRef(null);
  const clusterSourceRef = useRef(null);
  const highlightSourceRef = useRef(null);
  const querySourceRef = useRef(null);
  const pointsDataRef = useRef([]);

  const touchPointsLayer = useCallback(() => {
    map?.getLayers().getArray().find((l) => l.get('title') === 'Noktalar')?.changed();
  }, [map]);

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
    touchPointsLayer();
  }, [touchPointsLayer]);

  const replaceAllPointsOnMap = useCallback((list) => {
    const source = vectorSourceRef.current;
    if (!source) return;
    source.clear();
    const dtos = list ?? [];
    source.addFeatures(dtos.map(dtoToFeature));
    pointsDataRef.current = dtos;
    touchPointsLayer();
  }, [touchPointsLayer]);

  const removePointFromMap = useCallback((id) => {
    const source = vectorSourceRef.current;
    const existing = source?.getFeatureById(id);
    if (existing) source.removeFeature(existing);
    pointsDataRef.current = pointsDataRef.current.filter((p) => p.id !== id);
    highlightSourceRef.current?.clear();
    touchPointsLayer();
  }, [touchPointsLayer]);

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

  const highlightPoint = useCallback((dto) => {
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
    if (!map) return;
    const auxLayers = setupAuxiliaryLayers(map);
    return () => auxLayers.forEach((layer) => map.removeLayer(layer));
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const clusterSource = new Cluster({ ...CLUSTER_OPTIONS, source: vectorSource });
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

  return {
    vectorSourceRef,
    clusterSourceRef,
    highlightSourceRef,
    querySourceRef,
    pointsDataRef,
    upsertPointOnMap,
    replaceAllPointsOnMap,
    removePointFromMap,
    clearQueryLayer,
    highlightMultiple,
    highlightPoint,
  };
}
