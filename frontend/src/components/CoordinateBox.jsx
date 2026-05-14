// ============================================================================
// CoordinateBox — Mouse'un harita üzerindeki anlık koordinatlarını gösterir
// ----------------------------------------------------------------------------
// Ödev şartı (madde 1): "Harita üzerinde mouse konumuna göre anlık koordinat
// gösterimi yapılmalıdır."
// Ödev şartı (madde 7): "Kullanıcı haritaya tıkladığında koordinatlar hem
// EPSG:3857 hem EPSG:4326 formatında gösterilmelidir." → Biz fare hareketinde
// de gösteriyoruz, daha kullanışlı.
//
// Konum: Haritanın sağ üst köşesinde, yarı saydam kutu.
// ============================================================================

import { Paper, Stack, Typography } from '@mui/material';

/**
 * @param {object} props
 * @param {{ lon: number, lat: number } | null} props.lonLat  EPSG:4326
 * @param {{ x: number, y: number } | null}     props.mercator EPSG:3857
 */
function CoordinateBox({ lonLat, mercator }) {
  // Haritanın dışındaysa (null) hâlâ kutuyu gösterip "—" diyoruz
  const lonStr = lonLat ? lonLat.lon.toFixed(5) : '—';
  const latStr = lonLat ? lonLat.lat.toFixed(5) : '—';
  const xStr = mercator ? mercator.x.toFixed(1) : '—';
  const yStr = mercator ? mercator.y.toFixed(1) : '—';

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 12,
        right: 12,
        px: 1.5,
        py: 1,
        minWidth: 240,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        pointerEvents: 'none', // Kutu fare etkileşimini engellemesin
        zIndex: 1000,
        fontFamily: 'monospace',
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="caption" fontWeight="bold" color="primary">
          EPSG:4326 (WGS84)
        </Typography>
        <Typography variant="body2">
          Lon: <strong>{lonStr}</strong>°&nbsp;&nbsp;Lat: <strong>{latStr}</strong>°
        </Typography>
        <Typography variant="caption" fontWeight="bold" color="primary" sx={{ mt: 0.5 }}>
          EPSG:3857 (Web Mercator)
        </Typography>
        <Typography variant="body2">
          X: <strong>{xStr}</strong>&nbsp;&nbsp;Y: <strong>{yStr}</strong>
        </Typography>
      </Stack>
    </Paper>
  );
}

export default CoordinateBox;
