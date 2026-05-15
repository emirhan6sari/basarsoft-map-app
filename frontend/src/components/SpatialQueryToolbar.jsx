/**
 * Mekansal sorgu araç seçici — Buffer / Dikdörtgen / Poligon.
 */

import { Paper, Stack, Button, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CropFreeIcon from '@mui/icons-material/CropFree';
import PolylineIcon from '@mui/icons-material/Polyline';

const TOOLS = [
  {
    id: 'spatialBuffer',
    label: 'Buffer',
    desc: 'Nokta + mesafe',
    Icon: RadioButtonCheckedIcon,
  },
  {
    id: 'spatialBox',
    label: 'Dikdörtgen',
    desc: 'Alan çiz',
    Icon: CropFreeIcon,
  },
  {
    id: 'spatialPolygon',
    label: 'Poligon',
    desc: 'Serbest çizim',
    Icon: PolylineIcon,
  },
];

export default function SpatialQueryToolbar({ onSelect, onClose }) {
  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        top: 72,
        right: 72,
        zIndex: 1100,
        p: 1.5,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.97)',
        minWidth: 220,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Mekansal Sorgu
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Kapat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack spacing={0.75}>
        {TOOLS.map(({ id, label, desc, Icon }) => (
          <Button
            key={id}
            variant="outlined"
            onClick={() => onSelect(id)}
            startIcon={<Icon />}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              borderRadius: 1.5,
              py: 1,
            }}
          >
            <Stack alignItems="flex-start" spacing={0}>
              <Typography variant="body2" fontWeight={600}>{label}</Typography>
              <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </Stack>
          </Button>
        ))}
      </Stack>
    </Paper>
  );
}
