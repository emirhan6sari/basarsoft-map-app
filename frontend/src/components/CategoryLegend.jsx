/**
 * Kategori legend — sol üstte yuvarlak ikon; tıklanınca liste açılır.
 */

import { useMemo, useState } from 'react';
import {
  Paper, Typography, Box, IconButton, Tooltip, Collapse, ClickAwayListener,
} from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';
import { getCategoryStyleMeta } from '../utils/mapPointStyles';
import { sortCategories, getCategoryKey, getCategoryLabel } from '../utils/categoryUtils';

export default function CategoryLegend({ visible, categories = [], top = 72 }) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => sortCategories(categories), [categories]);

  if (!visible || sorted.length === 0) return null;

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
          width: open ? 220 : 'auto',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tooltip title={open ? 'Kategorileri kapat' : 'Kategoriler'} placement="right">
            <IconButton
              onClick={toggle}
              aria-label="Kategoriler"
              aria-expanded={open}
              color={open ? 'primary' : 'default'}
              size="medium"
              sx={{ '& svg': { fontSize: 26 } }}
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
              width: 220,
              boxSizing: 'border-box',
            }}
          >
            <Typography
              variant="caption"
              component="p"
              sx={{
                fontWeight: 700,
                color: '#546e7a',
                mb: 1,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: '0.68rem',
                lineHeight: 1.2,
              }}
            >
              Kategoriler
            </Typography>
            <Box
              component="ul"
              sx={{
                listStyle: 'none',
                m: 0,
                p: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {sorted.map((cat) => {
                const name = getCategoryKey(cat);
                const label = getCategoryLabel(cat);
                const { fill, stroke } = getCategoryStyleMeta(name);
                return (
                  <Box
                    component="li"
                    key={name}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '14px minmax(0, 1fr)',
                      columnGap: '10px',
                      alignItems: 'center',
                      minHeight: 20,
                    }}
                  >
                    {/* Sabit grid: nokta + etiket hizası kaymasın */}
                    <Box
                      component="span"
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: fill,
                        border: `2px solid ${stroke}`,
                        display: 'block',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        fontSize: '0.8rem',
                        color: '#37474f',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Collapse>
      </Box>
    </ClickAwayListener>
  );
}
