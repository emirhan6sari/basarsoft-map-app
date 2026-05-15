// ============================================================================
// CoordinateBox — Fare ve tıklama konumunda EPSG:4326 + EPSG:3857 gösterimi
// ============================================================================

import { Paper, Stack, Divider, Box, Typography } from '@mui/material';
import { fmt4326, fmt3857 } from '../utils/coordinateTransform';

const VALUE_BOX_WIDTH = 200;

function CoordRow({ srid, label, value, accent }) {
  return (
    <Box sx={{ minWidth: VALUE_BOX_WIDTH, textAlign: 'center' }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: accent, fontWeight: 700, letterSpacing: 0.4 }}
      >
        {srid}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#263238' }}
      >
        <Box component="span" sx={{ color: '#546e7a', fontWeight: 600 }}>{label}: </Box>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * @param {{ lon: number, lat: number, x: number, y: number } | null} pointerCoord  EPSG:3857 fare
 * @param {{ lon: number, lat: number, x: number, y: number } | null} clickCoord     Son tıklama
 */
function CoordinateBox({ pointerCoord, clickCoord }) {
  const ptr4326 = pointerCoord
    ? fmt4326(pointerCoord.lon, pointerCoord.lat)
    : '—';
  const ptr3857 = pointerCoord
    ? fmt3857(pointerCoord.x, pointerCoord.y)
    : '—';

  const click4326 = clickCoord
    ? fmt4326(clickCoord.lon, clickCoord.lat, 6)
    : null;
  const click3857 = clickCoord
    ? fmt3857(clickCoord.x, clickCoord.y, 2)
    : null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        px: 2,
        py: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        pointerEvents: 'none',
        zIndex: 1000,
        maxWidth: '96vw',
      }}
    >
      <Typography
        variant="caption"
        sx={{ display: 'block', textAlign: 'center', color: '#78909c', mb: 0.5 }}
      >
        Fare konumu
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        divider={<Divider orientation="vertical" flexItem />}
      >
        <CoordRow srid="EPSG:4326" label="WGS84" value={ptr4326} accent="#1565c0" />
        <CoordRow srid="EPSG:3857" label="Web Mercator" value={ptr3857} accent="#2e7d32" />
      </Stack>

      {clickCoord && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', color: '#e65100', fontWeight: 700, mb: 0.5 }}
          >
            Tıklanan nokta
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={2}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <CoordRow srid="EPSG:4326" label="WGS84" value={click4326} accent="#1565c0" />
            <CoordRow srid="EPSG:3857" label="Web Mercator" value={click3857} accent="#2e7d32" />
          </Stack>
        </>
      )}
    </Paper>
  );
}

export default CoordinateBox;
