import { Paper, Typography, Stack } from '@mui/material';

export default function MeasurementResultPanel({ live, result }) {
  if (!live && !result) return null;

  const title = live ? 'Ölçülüyor…' : 'Son ölçüm';
  const value = live?.value ?? result?.value;
  const kindLabel = (live?.kind ?? result?.kind) === 'area' ? 'Alan' : 'Uzunluk';

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 24,
        left: 12,
        zIndex: 1100,
        px: 2,
        py: 1.25,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderLeft: '4px solid #6a1b9a',
        minWidth: 180,
      }}
    >
      <Stack spacing={0.25}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {title} — {kindLabel}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#4a148c', lineHeight: 1.2 }}>
          {value}
        </Typography>
      </Stack>
    </Paper>
  );
}
