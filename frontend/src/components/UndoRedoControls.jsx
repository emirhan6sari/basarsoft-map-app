import { Paper, IconButton, Tooltip, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

export default function UndoRedoControls({
  canUndo,
  canRedo,
  busy,
  onUndo,
  onRedo,
}) {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 24,
        right: 12,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        px: 0.5,
        py: 0.25,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.96)',
      }}
    >
      <Tooltip title="Geri al (Ctrl+Z)">
        <span>
          <IconButton
            size="small"
            onClick={onUndo}
            disabled={!canUndo || busy}
            aria-label="Geri al"
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Yinele (Ctrl+Y)">
        <span>
          <IconButton
            size="small"
            onClick={onRedo}
            disabled={!canRedo || busy}
            aria-label="Yinele"
          >
            <RedoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.75, userSelect: 'none' }}>
        {busy ? '…' : 'Ctrl+Z / Ctrl+Y'}
      </Typography>
    </Paper>
  );
}
