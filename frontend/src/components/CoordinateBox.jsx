// ============================================================================
// CoordinateBox — Mouse'un harita üzerindeki anlık koordinatlarını gösterir
// ----------------------------------------------------------------------------
// Ödev şartı (madde 1): "Harita üzerinde mouse konumuna göre anlık koordinat
// gösterimi yapılmalıdır."
//
// Konum: Haritanın ALT ORTASINDA, yatay (lon ve lat yan yana) bir bant.
// EPSG:3857 (X/Y) ileride harita tıklama olayında ayrıca gösterilecek
// (ödev şartı madde 7); şu an mouse hareketinde sadece lon/lat yeterli.
// ============================================================================

import { Paper, Stack, Typography, Divider } from '@mui/material';

/**
 * @param {object} props
 * @param {{ lon: number, lat: number } | null} props.lonLat  EPSG:4326
 */
function CoordinateBox({ lonLat }) {
  // Harita dışındaysa "—" göster (kutu sabit kalsın, layout zıplamasın)
  const lonStr = lonLat ? lonLat.lon.toFixed(5) : '—';
  const latStr = lonLat ? lonLat.lat.toFixed(5) : '—';

  return (
    <Paper
      elevation={3}
      sx={{
        // Konum: harita konteynerinin alt ortası
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',

        px: 2,
        py: 0.75,
        minWidth: 280,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        pointerEvents: 'none', // fare etkileşimini engellemesin
        zIndex: 1000,
        fontFamily: 'monospace',
      }}
    >
      {/* Yatay düzen: Lon ve Lat yan yana, ortada ince bir ayraç */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        divider={<Divider orientation="vertical" flexItem />}
      >
        <Typography variant="body2">
          <strong style={{ color: '#1976d2' }}>Lon:</strong>&nbsp;{lonStr}°
        </Typography>
        <Typography variant="body2">
          <strong style={{ color: '#1976d2' }}>Lat:</strong>&nbsp;{latStr}°
        </Typography>
      </Stack>
    </Paper>
  );
}

export default CoordinateBox;
