/**
 * Buffer sorgusu — mesafe seçimi (500 / 1000 / 5000 m).
 */

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, ToggleButtonGroup, ToggleButton, Typography,
} from '@mui/material';
import { BUFFER_DISTANCES } from '../utils/spatialQuery';

export default function BufferDistanceDialog({
  open,
  centerLabel,
  onConfirm,
  onCancel,
}) {
  const [radius, setRadius] = useState(500);

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Buffer Sorgusu</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Merkez: <strong>{centerLabel}</strong>
        </Typography>
        <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 600 }}>
          Yarıçap seçin
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={radius}
          onChange={(_, v) => v && setRadius(v)}
          size="small"
        >
          {BUFFER_DISTANCES.map((d) => (
            <ToggleButton key={d.value} value={d.value}>
              {d.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>İptal</Button>
        <Button variant="contained" onClick={() => onConfirm(radius)}>
          Sorgula
        </Button>
      </DialogActions>
    </Dialog>
  );
}
