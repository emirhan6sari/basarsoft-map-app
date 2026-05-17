// ============================================================================
// ImportGeometryModal — WKT / GeoJSON içe aktarım (veritabanına kayıt)
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { importMapPoints } from '../api/mapPoints';
import { fetchCategories } from '../api/categories';
import { estimateImportPointCount } from '../utils/geoImportUtils';

const EXAMPLE_GEOJSON = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Depo A", "number": "DEP-101", "category": "Depo" },
      "geometry": { "type": "Point", "coordinates": [32.85, 39.92] }
    }
  ]
}`;

const EXAMPLE_WKT = 'MULTIPOINT ((32.85 39.92), (29.00 41.01))';

function ImportGeometryModal({ open, onImported, onClose }) {
  const fileRef = useRef(null);
  const [format, setFormat] = useState('geojson');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [namePrefix, setNamePrefix] = useState('İçe Aktarım');
  const [numberPrefix, setNumberPrefix] = useState('IMP');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        setCategories(cats ?? []);
        if (cats?.length > 0) setCategory(cats[0].name);
      })
      .catch(() => {
        const fallback = [
          { name: 'Depo', displayName: 'Depo' },
          { name: 'Bayi', displayName: 'Bayi' },
          { name: 'Musteri', displayName: 'Müşteri' },
          { name: 'Ofis', displayName: 'Ofis' },
        ];
        setCategories(fallback);
        setCategory('Depo');
      });
  }, []);

  useEffect(() => {
    if (open) {
      setContent('');
      setFormat('geojson');
      setNamePrefix('İçe Aktarım');
      setNumberPrefix('IMP');
      setDefaultDescription('');
      if (categories.length > 0) setCategory(categories[0].name);
      setError(null);
      setResult(null);
      setSubmitting(false);
    }
  }, [open, categories]);

  const pointEstimate = useMemo(
    () => estimateImportPointCount(format, content),
    [format, content],
  );

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.wkt')) setFormat('wkt');
    else if (lower.endsWith('.json') || lower.endsWith('.geojson')) setFormat('geojson');

    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result ?? ''));
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('WKT veya GeoJSON metni girin veya dosya seçin.');
      return;
    }
    if (!category) {
      setError('Kategori seçin.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const data = await importMapPoints({
        format,
        content: content.trim(),
        category,
        namePrefix: namePrefix.trim() || 'İçe Aktarım',
        numberPrefix: numberPrefix.trim() || 'IMP',
        defaultDescription: defaultDescription.trim() || undefined,
      });
      setResult(data);
      if (data?.createdCount > 0) {
        onImported?.(data);
      }
    } catch (err) {
      if (err.validationErrors) {
        setError(Object.values(err.validationErrors).flat().join(' • '));
      } else {
        setError(err.message ?? 'İçe aktarım başarısız.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const loadExample = () => {
    if (format === 'wkt') setContent(EXAMPLE_WKT);
    else setContent(EXAMPLE_GEOJSON);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>WKT / GeoJSON İçe Aktar</DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Point, MultiPoint, LineString ve Polygon geometrilerinden koordinatlar çıkarılır
              ve harita noktası olarak veritabanına kaydedilir. Feature özelliklerinde
              name, number, category varsa kullanılır.
            </Typography>

            <ToggleButtonGroup
              exclusive
              size="small"
              value={format}
              onChange={(_, v) => { if (v) { setFormat(v); setResult(null); } }}
              disabled={submitting}
            >
              <ToggleButton value="geojson">GeoJSON</ToggleButton>
              <ToggleButton value="wkt">WKT</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={submitting}
              >
                Dosya Seç
              </Button>
              <Button size="small" onClick={loadExample} disabled={submitting}>
                Örnek Yükle
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.geojson,.wkt,.txt"
                hidden
                onChange={handleFile}
              />
              {pointEstimate !== null && (
                <Typography variant="caption" color="primary">
                  ~{pointEstimate} nokta algılandı
                </Typography>
              )}
              {content.trim() && pointEstimate === null && (
                <Typography variant="caption" color="warning.main">
                  Geometri okunamadı — biçimi kontrol edin
                </Typography>
              )}
            </Stack>

            <TextField
              label={format === 'wkt' ? 'WKT metni' : 'GeoJSON'}
              value={content}
              onChange={(ev) => { setContent(ev.target.value); setResult(null); }}
              multiline
              minRows={8}
              maxRows={16}
              fullWidth
              size="small"
              disabled={submitting}
              placeholder={format === 'wkt' ? 'POINT (32.85 39.92)' : '{ "type": "FeatureCollection", ... }'}
              inputProps={{ spellCheck: false }}
            />

            <TextField
              select
              label="Varsayılan kategori *"
              value={category}
              onChange={(ev) => setCategory(ev.target.value)}
              size="small"
              fullWidth
              disabled={submitting || categories.length === 0}
            >
              {categories.map((c) => (
                <MenuItem key={c.name ?? c.id} value={c.name}>
                  {c.displayName ?? c.name}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Ad öneki"
                value={namePrefix}
                onChange={(ev) => setNamePrefix(ev.target.value)}
                size="small"
                fullWidth
                disabled={submitting}
                helperText="Özellikte ad yoksa: Ad öneki 1, 2…"
              />
              <TextField
                label="Numara öneki"
                value={numberPrefix}
                onChange={(ev) => setNumberPrefix(ev.target.value)}
                size="small"
                fullWidth
                disabled={submitting}
                helperText="Özellikte kod yoksa: IMP-0001"
              />
            </Stack>

            <TextField
              label="Varsayılan açıklama"
              value={defaultDescription}
              onChange={(ev) => setDefaultDescription(ev.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
              disabled={submitting}
            />

            {error && <Alert severity="error">{error}</Alert>}

            {result && (
              <Alert severity={result.createdCount > 0 ? 'success' : 'warning'}>
                {result.createdCount} nokta kaydedildi
                {result.skippedCount > 0 ? `, ${result.skippedCount} atlandı` : ''}.
              </Alert>
            )}

            {result?.skipped?.length > 0 && (
              <Box sx={{ maxHeight: 160, overflow: 'auto', bgcolor: '#fafafa', borderRadius: 1 }}>
                <List dense disablePadding>
                  {result.skipped.slice(0, 20).map((s) => (
                    <ListItem key={`${s.index}-${s.longitude}`} divider>
                      <ListItemText
                        primary={`#${s.index} — ${s.latitude?.toFixed?.(5)}, ${s.longitude?.toFixed?.(5)}`}
                        secondary={s.reason}
                        primaryTypographyProps={{ variant: 'caption' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
                {result.skipped.length > 20 && (
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block' }}>
                    … ve {result.skipped.length - 20} kayıt daha
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            {result?.createdCount > 0 ? 'Kapat' : 'İptal'}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !content.trim()}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {submitting ? 'Aktarılıyor…' : 'Veritabanına Kaydet'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default ImportGeometryModal;
