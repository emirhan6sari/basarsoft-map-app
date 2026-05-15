// ============================================================================
// LayersPanel — Katman görünürlüğü (OSM, noktalar, yardımcı GeoJSON katmanları)
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import {
  Paper,
  Stack,
  Typography,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Collapse,
  Box,
  Divider,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';

/**
 * @param {import('ol/Map').default | null} map
 * @param {boolean} [open] Kontrollü açık/kapalı (menüden "Katmanlar")
 * @param {(open: boolean) => void} [onOpenChange]
 */
function LayersPanel({ map, open: openProp, onOpenChange }) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;

  const [visibilities, setVisibilities] = useState({});

  const sortedTitles = useMemo(() => {
    if (!map) return [];
    return map.getLayers().getArray()
      .map((layer, index) => ({
        title: layer.get('title') ?? 'İsimsiz katman',
        zIndex: layer.getZIndex?.() ?? index,
        index,
        baseLayer: layer.get('baseLayer') === true,
      }))
      .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index)
      .map((x) => x.title);
  }, [map, visibilities]);

  useEffect(() => {
    if (!map) return;

    const refresh = () => {
      const updated = {};
      map.getLayers().forEach((layer) => {
        const title = layer.get('title') ?? 'İsimsiz katman';
        updated[title] = layer.getVisible();
      });
      setVisibilities(updated);
    };

    refresh();
    map.getLayers().on('add', refresh);
    map.getLayers().on('remove', refresh);

    return () => {
      map.getLayers().un('add', refresh);
      map.getLayers().un('remove', refresh);
    };
  }, [map]);

  const handleToggle = (title) => {
    if (!map) return;
    const layer = map.getLayers().getArray().find(
      (l) => (l.get('title') ?? 'İsimsiz katman') === title,
    );
    if (!layer) return;

    const next = !layer.getVisible();
    layer.setVisible(next);
    setVisibilities((prev) => ({ ...prev, [title]: next }));
  };

  if (!map) return null;

  const baseTitles = sortedTitles.filter((t) => t.includes('OpenStreetMap') || t === 'Noktalar');
  const auxTitles = sortedTitles.filter((t) => !baseTitles.includes(t));

  const renderGroup = (titles, label) => {
    if (!titles.length) return null;
    return (
      <>
        {label && (
          <Typography variant="caption" sx={{ color: '#78909c', fontWeight: 700, pt: 0.5 }}>
            {label}
          </Typography>
        )}
        {titles.map((title) => (
          <FormControlLabel
            key={title}
            control={
              <Checkbox
                checked={Boolean(visibilities[title])}
                onChange={() => handleToggle(title)}
                size="small"
              />
            }
            label={<Typography variant="body2">{title}</Typography>}
            sx={{ ml: 0, mr: 0, display: 'flex' }}
          />
        ))}
      </>
    );
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 1000,
        minWidth: open ? 300 : 'auto',
        maxHeight: '70vh',
      }}
    >
      <Collapse in={open} timeout={250} collapsedSize={0} unmountOnExit>
        <Paper
          elevation={3}
          sx={{
            px: 2,
            py: 1.5,
            mb: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderRadius: 2,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Katmanlar
          </Typography>
          <Stack spacing={0.25} divider={<Divider flexItem sx={{ my: 0.5 }} />}>
            {renderGroup(baseTitles, 'Temel')}
            {renderGroup(auxTitles, auxTitles.length ? 'Yardımcı' : null)}
          </Stack>
          {sortedTitles.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              (henüz katman yok)
            </Typography>
          )}
        </Paper>
      </Collapse>

      <Paper
        elevation={3}
        sx={{
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          width: 'fit-content',
        }}
      >
        <Tooltip title={open ? 'Katmanları kapat' : 'Katmanları göster'} placement="right">
          <IconButton
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            color={open ? 'primary' : 'default'}
            size="large"
            sx={{ '& svg': { fontSize: 28 } }}
          >
            <LayersIcon />
          </IconButton>
        </Tooltip>
      </Paper>
    </Box>
  );
}

export default LayersPanel;
