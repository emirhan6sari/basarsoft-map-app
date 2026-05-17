import { Style, Fill, Stroke, Text, Circle as CircleStyle } from 'ol/style';
import { LineString, Point, Polygon } from 'ol/geom';
import { formatArea, formatLength } from './measureFormat';

const STROKE_COLOR = '#6a1b9a';
const FILL_COLOR = 'rgba(106, 27, 154, 0.12)';

const baseStroke = new Stroke({ color: STROKE_COLOR, width: 2.5 });
const baseFill = new Fill({ color: FILL_COLOR });
const labelFont = '600 12px system-ui, sans-serif';

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function lineStyles(geometry) {
  const styles = [
    new Style({ stroke: baseStroke }),
  ];
  const coords = geometry.getCoordinates();
  geometry.forEachSegment((start, end) => {
    const segment = new LineString([start, end]);
    styles.push(new Style({
      geometry: new Point(midpoint(start, end)),
      text: new Text({
        text: formatLength(segment),
        font: labelFont,
        fill: new Fill({ color: '#4a148c' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
        offsetY: -12,
      }),
    }));
  });
  if (coords.length > 1) {
    styles.push(new Style({
      geometry: new Point(coords[coords.length - 1]),
      text: new Text({
        text: `Toplam: ${formatLength(geometry)}`,
        font: '700 13px system-ui, sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        backgroundFill: new Fill({ color: STROKE_COLOR }),
        padding: [4, 6, 4, 6],
        offsetY: -18,
      }),
    }));
  }
  return styles;
}

function polygonStyles(geometry) {
  return [
    new Style({
      fill: baseFill,
      stroke: baseStroke,
      text: new Text({
        text: formatArea(geometry),
        font: '700 13px system-ui, sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        backgroundFill: new Fill({ color: STROKE_COLOR }),
        padding: [5, 8, 5, 8],
        overflow: true,
      }),
      geometry: (feature) => {
        const poly = feature.getGeometry();
        if (!(poly instanceof Polygon)) return poly;
        return poly.getInteriorPoint();
      },
    }),
    new Style({
      image: new CircleStyle({
        radius: 4,
        fill: new Fill({ color: STROKE_COLOR }),
        stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
      }),
    }),
  ];
}

/** Ölçüm katmanı — segment ve toplam etiketleri. */
export function createMeasureStyleFunction() {
  return (feature) => {
    const geometry = feature.getGeometry();
    if (!geometry) return [];
    const type = geometry.getType();
    if (type === 'LineString') return lineStyles(geometry);
    if (type === 'Polygon') return polygonStyles(geometry);
    return [new Style({ stroke: baseStroke, fill: baseFill })];
  };
}
