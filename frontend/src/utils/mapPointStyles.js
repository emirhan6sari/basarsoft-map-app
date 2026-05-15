/**
 * Harita noktası ve cluster stilleri — kategoriler DB'den dinamik renk alır.
 */

import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';

const STROKE = '#ffffff';
const POINT_RADIUS = 8;

/** Yeni kategoriler için döngüsel palet (sıra veya hash ile atanır) */
const COLOR_PALETTE = [
  '#1976d2', '#2e7d32', '#ed6c02', '#7b1fa2',
  '#00838f', '#c62828', '#5d4037', '#6a1b9a',
  '#1565c0', '#558b2f', '#f9a825', '#ad1457',
];

const DEFAULT_FILL = '#e53935';

/** name → fill rengi (registerCategories ile güncellenir) */
const categoryColorMap = new Map();
const pointStyleCache = new Map();

function hashCategory(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

/** Kategori adına göre renk — kayıtlı değilse paletten deterministik seçim */
export function getCategoryColor(categoryName) {
  if (!categoryName) return DEFAULT_FILL;
  if (categoryColorMap.has(categoryName)) {
    return categoryColorMap.get(categoryName);
  }
  const fill = COLOR_PALETTE[hashCategory(categoryName) % COLOR_PALETTE.length];
  categoryColorMap.set(categoryName, fill);
  return fill;
}

/** API'den gelen kategori listesini kaydet; legend ve harita stilleri senkron kalır */
export function registerCategories(categories) {
  categoryColorMap.clear();
  pointStyleCache.clear();

  const sorted = [...(categories ?? [])].sort(
    (a, b) => (a.sortOrder ?? a.SortOrder ?? 0) - (b.sortOrder ?? b.SortOrder ?? 0),
  );

  sorted.forEach((cat, index) => {
    const name = cat.name ?? cat.Name;
    if (!name) return;
    categoryColorMap.set(name, COLOR_PALETTE[index % COLOR_PALETTE.length]);
  });
}

/** Legend ve UI için { fill, stroke, radius } */
export function getCategoryStyleMeta(categoryName) {
  return {
    fill: getCategoryColor(categoryName),
    stroke: STROKE,
    radius: POINT_RADIUS,
  };
}

function buildPointStyle(fill) {
  return new Style({
    image: new CircleStyle({
      radius: POINT_RADIUS,
      fill: new Fill({ color: fill }),
      stroke: new Stroke({ color: STROKE, width: 2 }),
    }),
  });
}

/** Tek nokta stili (kategoriye göre önbellekli) */
export function getPointStyle(category) {
  const key = category || '_default';
  if (!pointStyleCache.has(key)) {
    pointStyleCache.set(key, buildPointStyle(getCategoryColor(category)));
  }
  return pointStyleCache.get(key);
}

/** Cluster kaynağı için stil fonksiyonu */
export function createClusterStyleFunction() {
  return (feature) => {
    const members = feature.get('features');
    const size = members?.length ?? 0;

    if (size === 0) return null;

    if (size === 1) {
      const data = members[0].get('pointData');
      return getPointStyle(data?.category);
    }

    const radius = Math.min(12 + Math.log2(size) * 4, 24);
    return new Style({
      image: new CircleStyle({
        radius,
        fill: new Fill({ color: 'rgba(55, 71, 79, 0.88)' }),
        stroke: new Stroke({ color: STROKE, width: 2.5 }),
      }),
      text: new Text({
        text: String(size),
        fill: new Fill({ color: '#ffffff' }),
        font: 'bold 13px system-ui, sans-serif',
      }),
    });
  };
}

export const HIGHLIGHT_STYLE = new Style({
  image: new CircleStyle({
    radius: 14,
    fill: new Fill({ color: 'rgba(255, 152, 0, 0.35)' }),
    stroke: new Stroke({ color: '#f57c00', width: 3 }),
  }),
});

export const CLUSTER_OPTIONS = {
  distance: 45,
  minDistance: 24,
};

/** Buffer / dikdörtgen / poligon sorgu geometrisi */
export const SPATIAL_QUERY_STYLE = new Style({
  fill: new Fill({ color: 'rgba(25, 118, 210, 0.14)' }),
  stroke: new Stroke({ color: '#1565c0', width: 2.5, lineDash: [10, 6] }),
});
