import { Paper, Typography } from '@mui/material';

/** OpenLayers +/- kontrollerinin sağında anlık zoom seviyesi. */
export default function MapZoomLabel({ zoom }) {
  if (zoom == null) return null;

  const value = Number(zoom).toFixed(1);

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        top: 24,
        left: 40,
        zIndex: 1001,
        px: 1.25,
        py: 0.35,
        borderRadius: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        pointerEvents: 'none',
        minWidth: 72,
        textAlign: 'center',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: '#455a64', letterSpacing: 0.3 }}
      >
        Zoom {value}
      </Typography>
    </Paper>
  );
}
