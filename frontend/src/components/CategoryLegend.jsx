/**
 * Kategori legend — sol üstte yuvarlak ikon; tıklanınca liste açılır.
 */

import { useState } from 'react';
import {
  Paper, Stack, Typography, Box, IconButton, Tooltip, Collapse, ClickAwayListener,
} from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';
import { getCategoryStyleMeta } from '../utils/mapPointStyles';

export default function CategoryLegend({ visible, categories = [], top = 72 }) {
  const [open, setOpen] = useState(false);

  if (!visible || categories.length === 0) return null;

  const toggle = () => setOpen((p) => !p);
  const close = () => setOpen(false);

  return (
    <ClickAwayListener onClickAway={close}>
      <Box
        sx={{
          position: 'absolute',
          top,
          left: 12,
          zIndex: 1000,
          minWidth: open ? 200 : 'auto',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            width: 'fit-content',
          }}
        >
          <Tooltip title={open ? 'Kategorileri kapat' : 'Kategoriler'} placement="right">
            <IconButton
              onClick={toggle}
              aria-label="Kategoriler"
              aria-expanded={open}
              color={open ? 'primary' : 'default'}
              size="medium"
              sx={{
                '& svg': { fontSize: 26 },
              }}
            >
              <LabelIcon />
            </IconButton>
          </Tooltip>
        </Paper>

        <Collapse in={open} timeout={250} unmountOnExit>
          <Paper
            elevation={3}
            sx={{
              mt: 1,
              px: 1.5,
              py: 1.25,
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              borderRadius: 2,
              minWidth: 180,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: '#546e7a',
                display: 'block',
                mb: 0.75,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: '0.68rem',
              }}
            >
              Kategoriler
            </Typography>
            <Stack spacing={0.5}>
              {categories.map((cat) => {
                const name = cat.name ?? cat.Name;
                const label = cat.displayName ?? cat.DisplayName ?? name;
                const { fill, stroke } = getCategoryStyleMeta(name);
                return (
                  <Stack key={name} direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: fill,
                        border: `2px solid ${stroke}`,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.8rem', color: '#37474f' }}>
                      {label}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        </Collapse>
      </Box>
    </ClickAwayListener>
  );
}
