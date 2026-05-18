// ============================================================================
// AddPointModal — Yeni nokta ekleme formu
// Kategori listesi MapView state'inden gelir (DB /api/categories ile yüklenir).
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, Typography,
  Alert, Box, CircularProgress,
} from '@mui/material';

import { createMapPoint } from '../api/mapPoints';
import { withProximityConfirm } from '../utils/proximityConfirm';
import { fmt4326, fmt3857 } from '../utils/coordinateTransform';
import { sortCategories, getCategoryKey, getCategoryLabel } from '../utils/categoryUtils';

function AddPointModal({
  open,
  coordinate,
  categories = [],
  onRefreshCategories,
  confirmProximityWarning = false,
  onCreated,
  onClose,
}) {
  const [name, setName]             = useState('');
  const [number, setNumber]         = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  // MapView'den gelen DB kategorileri; sıra numarasına göre sıralı
  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);

  // Liste henüz yüklenmediyse MapView'de yeniden çek
  useEffect(() => {
    if (open && sortedCategories.length === 0 && onRefreshCategories) {
      onRefreshCategories();
    }
  }, [open, sortedCategories.length, onRefreshCategories]);

  // Modal açıldığında formu sıfırla; varsayılan kategori = ilk sıradaki
  useEffect(() => {
    if (!open) return;
    setName('');
    setNumber('');
    setDescription('');
    setError(null);
    setSubmitting(false);
    if (sortedCategories.length > 0) {
      setCategory(getCategoryKey(sortedCategories[0]));
    } else {
      setCategory('');
    }
  }, [open, sortedCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())   { setError('Nokta adı zorunludur.');  return; }
    if (!number.trim()) { setError('Numara/Kod zorunludur.'); return; }
    if (!coordinate)    { setError('Koordinat eksik.');        return; }
    if (!category)      { setError('Kategori seçin veya kategorilerin yüklenmesini bekleyin.'); return; }

    setSubmitting(true); setError(null);
    try {
      const payload = {
        name:        name.trim(),
        number:      number.trim(),
        description: description.trim() || undefined,
        category,
        longitude:   coordinate.longitude,
        latitude:    coordinate.latitude,
        xMercator:   coordinate.xMercator,
        yMercator:   coordinate.yMercator,
        confirmProximityWarning,
      };
      const created = await withProximityConfirm(createMapPoint, payload);
      onCreated(created);
      onClose();
    } catch (err) {
      if (err.validationErrors) {
        setError(Object.values(err.validationErrors).flat().join(' • '));
      } else {
        setError(err.message ?? 'Kaydedilemedi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const categoriesLoading = open && sortedCategories.length === 0;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Yeni Nokta Ekle</DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {coordinate && (
              <Box sx={{ bgcolor: '#f5f7fa', borderRadius: 1, p: 1.25 }}>
                <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 700 }}>
                  EPSG:4326
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 0.75 }}>
                  {fmt4326(coordinate.longitude, coordinate.latitude, 6)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                  EPSG:3857
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {fmt3857(coordinate.xMercator, coordinate.yMercator)}
                </Typography>
              </Box>
            )}

            <TextField
              label="Nokta Adı *"
              value={name}
              onChange={e => setName(e.target.value)}
              size="small" fullWidth autoFocus
              inputProps={{ maxLength: 200 }}
              disabled={submitting}
            />

            <TextField
              label="Numara / Kod *"
              value={number}
              onChange={e => setNumber(e.target.value)}
              size="small" fullWidth
              inputProps={{ maxLength: 50 }}
              disabled={submitting}
              helperText="örn. DEP-001, BAYI-42"
            />

            <TextField
              select
              label="Kategori *"
              value={category}
              onChange={e => setCategory(e.target.value)}
              size="small" fullWidth
              disabled={submitting || categoriesLoading}
              helperText={categoriesLoading ? 'Kategoriler veritabanından yükleniyor…' : undefined}
            >
              {categoriesLoading
                ? <MenuItem value=""><CircularProgress size={16} sx={{ mr: 1 }} /> Yükleniyor…</MenuItem>
                : sortedCategories.map(c => {
                    const key = getCategoryKey(c);
                    return (
                      <MenuItem key={key} value={key}>
                        {getCategoryLabel(c)}
                      </MenuItem>
                    );
                  })
              }
            </TextField>

            <TextField
              label="Açıklama"
              value={description}
              onChange={e => setDescription(e.target.value)}
              multiline rows={2}
              inputProps={{ maxLength: 2000 }}
              disabled={submitting}
              fullWidth size="small"
            />

            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>İptal</Button>
          <Button type="submit" variant="contained" disabled={submitting || categoriesLoading || !category}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default AddPointModal;
