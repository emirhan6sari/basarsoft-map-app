/**
 * Ölçüm araç seçici — uzunluk (çizgi) / alan (poligon).
 */

import { Paper, Stack, Button, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StraightenIcon from '@mui/icons-material/Straighten';
import SquareFootIcon from '@mui/icons-material/SquareFoot';

const TOOLS = [
  {
    id: 'measureLength',
    label: 'Uzunluk',
    desc: 'Çizgi çiz',
    Icon: StraightenIcon,
  },
  {
    id: 'measureArea',
    label: 'Alan',
    desc: 'Poligon çiz',
    Icon: SquareFootIcon,
  },
];

export default function MeasurementToolbar({ onSelect, onClose, onClear, featureCount }) {
  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        top: 72,
        left: 12,
        zIndex: 1100,
        p: 1.5,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.97)',
        minWidth: 200,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Ölçüm
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

        {featureCount > 0 && (
          <Button
            size="small"
            color="secondary"
            onClick={onClear}
            sx={{ mt: 0.5, textTransform: 'none' }}
          >
            Çizimleri temizle ({featureCount})
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
