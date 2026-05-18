/**
 * Haritada tıklanan nokta — detay / düzenleme / silme (Sorgula modalı ile uyumlu tema).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, Typography, Box,
  Alert, IconButton, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SaveIcon from '@mui/icons-material/Save';

import { updateMapPoint, deleteMapPoint } from '../api/mapPoints';
import { withProximityConfirm } from '../utils/proximityConfirm';
import { isAdmin } from '../api/auth';
import { getCategoryColor } from '../utils/mapPointStyles';
import { sortCategories, getCategoryKey, getCategoryLabel } from '../utils/categoryUtils';
import { fmt4326, fmt3857 } from '../utils/coordinateTransform';
import './PointDetailPopup.css';

function categoryLabel(categories, name) {
  const cat = categories.find((c) => (c.name ?? c.Name) === name);
  return cat?.displayName ?? cat?.DisplayName ?? name ?? '—';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DetailField({ label, value, mono, multiline }) {
  const valueClass = [
    'pdp-value',
    mono && 'pdp-value--mono',
    multiline && 'pdp-value--multiline',
  ].filter(Boolean).join(' ');

  return (
    <div className="pdp-field">
      <label>{label}</label>
      <div className={valueClass}>{value}</div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="pdp-section">
      {title && <h3 className="pdp-section-title">{title}</h3>}
      {children}
    </section>
  );
}

export default function PointDetailPopup({
  open,
  point,
  categories = [],
  onClose,
  onUpdated,
  onDeleted,
}) {
  const admin = isAdmin();
  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !point) return;
    setEditing(false);
    setDeleteOpen(false);
    setError(null);
    setSubmitting(false);
    setName(point.name ?? '');
    setNumber(point.number ?? '');
    setDescription(point.description ?? '');
    setCategory(point.category ?? '');
  }, [open, point]);

  if (!point) return null;

  const catLabel = categoryLabel(categories, point.category);
  const catColor = getCategoryColor(point.category);

  const handleSave = async () => {
    if (!name.trim()) { setError('Nokta adı zorunludur.'); return; }
    if (!number.trim()) { setError('Numara zorunludur.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        number: number.trim(),
        description: description.trim() || undefined,
        category,
        longitude: point.longitude,
        latitude: point.latitude,
        xMercator: point.xMercator,
        yMercator: point.yMercator,
      };
      const updated = await withProximityConfirm(
        (body) => updateMapPoint(point.id, body),
        payload,
      );
      onUpdated?.(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message ?? 'Güncellenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteMapPoint(point.id);
      setDeleteOpen(false);
      onDeleted?.(point.id);
      onClose();
    } catch (err) {
      setError(err.message ?? 'Silinemedi.');
      setDeleteOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '4px',
      backgroundColor: '#fff',
    },
  };

  const titleText = editing ? 'Noktayı Düzenle' : point.name;

  return (
    <>
      <Dialog
        className="pdp-dialog"
        open={open && !deleteOpen}
        onClose={submitting ? undefined : onClose}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#37474f',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1.5,
            pr: 1,
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}
            >
              {titleText}
            </Typography>
            {!editing && (
              <div className="pdp-header-meta">
                <span className="pdp-category-badge">
                  <span className="pdp-category-dot" style={{ background: catColor }} />
                  {catLabel}
                </span>
                <span className="pdp-header-number">#{point.number}</span>
              </div>
            )}
          </Box>
          <IconButton onClick={onClose} disabled={submitting} size="small" sx={{ color: '#fff' }} aria-label="Kapat">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <div className="pdp-content">
          {!editing ? (
            <>
              <DetailSection title="Genel bilgiler">
                <div className="pdp-row pdp-row--2">
                  <DetailField label="Numara" value={point.number} />
                  <DetailField label="Kategori" value={catLabel} />
                </div>
              </DetailSection>

              <DetailSection title="Koordinatlar">
                <div className="pdp-row">
                  <DetailField
                    label="EPSG:4326 (WGS84)"
                    value={fmt4326(point.longitude, point.latitude, 6)}
                    mono
                  />
                  <DetailField
                    label="EPSG:3857 (Web Mercator)"
                    value={fmt3857(point.xMercator, point.yMercator)}
                    mono
                  />
                </div>
              </DetailSection>

              <DetailSection title="Kayıt">
                <div className="pdp-row">
                  <DetailField
                    label="Açıklama"
                    value={point.description || 'Açıklama yok'}
                    multiline
                  />
                  <DetailField label="Oluşturulma" value={fmtDate(point.createdAt)} />
                </div>
              </DetailSection>

              {admin && (
                <DetailSection title="Ekleyen kullanıcı">
                  <div className="pdp-row pdp-row--2">
                    <DetailField label="Kullanıcı adı" value={point.createdByUserName ?? '—'} />
                    <DetailField label="Görünen ad" value={point.createdByDisplayName ?? '—'} />
                  </div>
                </DetailSection>
              )}
            </>
          ) : (
            <Stack spacing={2} sx={{ pt: 0 }}>
              <div className="pdp-coord-banner">
                <MyLocationIcon fontSize="small" sx={{ mt: 0.25, color: '#546e7a' }} />
                <span>
                  {fmt4326(point.longitude, point.latitude, 5)}
                  <br />
                  {fmt3857(point.xMercator, point.yMercator)} — konum değiştirilemez
                </span>
              </div>
              <TextField
                label="Nokta Adı"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                disabled={submitting}
                size="small"
                sx={fieldSx}
              />
              <TextField
                label="Numara"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                fullWidth
                disabled={submitting}
                size="small"
                sx={fieldSx}
              />
              <TextField
                select
                label="Kategori"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                disabled={submitting}
                size="small"
                sx={fieldSx}
              >
                {sortedCategories.map((c) => {
                  const n = getCategoryKey(c);
                  return (
                    <MenuItem key={n} value={n}>
                      {getCategoryLabel(c)}
                    </MenuItem>
                  );
                })}
              </TextField>
              <TextField
                label="Açıklama"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                fullWidth
                disabled={submitting}
                size="small"
                sx={fieldSx}
              />
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
              {error}
            </Alert>
          )}
          </div>
        </DialogContent>

        <DialogActions className="pdp-footer">
          {!editing ? (
            <>
              <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none' }}>
                Kapat
              </Button>
              <div className="pdp-footer-actions">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setEditing(true)}
                  disabled={submitting}
                  sx={{ textTransform: 'none' }}
                >
                  Düzenle
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteOpen(true)}
                  disabled={submitting}
                  sx={{ textTransform: 'none' }}
                >
                  Sil
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                onClick={() => setEditing(false)}
                disabled={submitting}
                sx={{ textTransform: 'none' }}
              >
                İptal
              </Button>
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={submitting}
                sx={{ textTransform: 'none' }}
              >
                {submitting ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        className="pdp-delete-dialog"
        open={deleteOpen}
        onClose={() => !submitting && setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#37474f', color: '#fff', py: 1.5, fontSize: '1rem', fontWeight: 700 }}>
          Noktayı sil
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>{point.name}</strong> kaydı haritadan kaldırılacak (soft delete). Devam etmek istiyor musunuz?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={submitting}
            sx={{ textTransform: 'none' }}
          >
            İptal
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={submitting}
            sx={{ textTransform: 'none' }}
          >
            {submitting ? 'Siliniyor…' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

