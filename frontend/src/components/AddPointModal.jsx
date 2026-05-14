// ============================================================================
// AddPointModal — Yeni nokta ekleme formu
// ----------------------------------------------------------------------------
// Ödev şartı:
//   Tıklama sonrasında açılan modalda: Nokta Adı, Numara/Kod, Açıklama,
//   Kategori (Depo/Bayi/Müşteri/Ofis) alınmalı.
//
// Akış:
//   1) MapView, kullanıcı haritaya tıklayınca bu modali açar;
//      props.coordinate tıklama koordinatını (EPSG:4326) içerir.
//   2) Yakın nokta varsa MapView zaten bir uyarı dialog'u gösterir; modal
//      sadece kullanıcı "yine de ekle" derse açılır.
//   3) Submit'te backend'e POST atılır. Başarılıysa props.onCreated ile
//      oluşturulan DTO MapView'a iletilir; MapView haritaya ekler.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
  Alert,
  Box,
} from '@mui/material';

import { createMapPoint } from '../api/mapPoints';

// Backend enum değerleriyle eşleşen liste.
// label: kullanıcıya gösterilen Türkçe metin
// value: backend'e gönderilen string (MapPointCategory enum ismi)
const CATEGORIES = [
  { value: 'Depo',    label: 'Depo'    },
  { value: 'Bayi',    label: 'Bayi'    },
  { value: 'Musteri', label: 'Müşteri' },
  { value: 'Ofis',    label: 'Ofis'    },
];

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {{ longitude: number, latitude: number } | null} props.coordinate
 * @param {(point: object) => void} props.onCreated  başarılı kayıtta parent'a iletim
 * @param {() => void} props.onClose
 */
function AddPointModal({ open, coordinate, onCreated, onClose }) {
  const [name, setName]             = useState('');
  const [number, setNumber]         = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState(CATEGORIES[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  // Modal her açıldığında formu sıfırla
  useEffect(() => {
    if (open) {
      setName('');
      setNumber('');
      setDescription('');
      setCategory(CATEGORIES[0].value);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim())   { setError('Nokta adı zorunludur.');  return; }
    if (!number.trim()) { setError('Numara/Kod zorunludur.'); return; }
    if (!coordinate)    { setError('Koordinat eksik.');        return; }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createMapPoint({
        name:        name.trim(),
        number:      number.trim(),
        description: description.trim() || undefined,
        category,                          // "Depo" | "Bayi" | "Musteri" | "Ofis"
        longitude:   coordinate.longitude,
        latitude:    coordinate.latitude,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors) {
        setError(Object.values(apiErrors).flat().join(' • '));
      } else {
        setError('Kaydedilemedi. Backend çalışıyor mu kontrol edin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Yeni Nokta Ekle</DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>

            {/* Tıklanan koordinat — sadece bilgi, düzenlenemez */}
            {coordinate && (
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                Konum: Lon {coordinate.longitude.toFixed(5)}° · Lat {coordinate.latitude.toFixed(5)}°
              </Typography>
            )}

            {/* Nokta Adı */}
            <TextField
              label="Nokta Adı *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              inputProps={{ maxLength: 200 }}
              disabled={submitting}
              fullWidth
            />

            {/* Numara / Kod */}
            <TextField
              label="Numara / Kod *"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              inputProps={{ maxLength: 50 }}
              disabled={submitting}
              fullWidth
              helperText="örn. DEP-001, BAYI-42"
            />

            {/* Kategori — MUI TextField select */}
            <TextField
              select
              label="Kategori *"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={submitting}
              fullWidth
            >
              {CATEGORIES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            {/* Açıklama */}
            <TextField
              label="Açıklama"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              inputProps={{ maxLength: 2000 }}
              disabled={submitting}
              fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>İptal</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default AddPointModal;
