/**
 * Haritada tıklanan nokta — premium detay / düzenleme / silme popup.
 */

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, Typography,
  Alert, Box, IconButton, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TableChartIcon from '@mui/icons-material/TableChart';
import LabelIcon from '@mui/icons-material/Label';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';

import { updateMapPoint, deleteMapPoint } from '../api/mapPoints';
import { isAdmin } from '../api/auth';
import { getCategoryColor } from '../utils/mapPointStyles';
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

function InfoCard({ icon: Icon, label, value, wide, mono }) {
  return (
    <div className={`pdp-card${wide ? ' pdp-card--wide' : ''}`}>
      <div className="pdp-card-label">
        <Icon fontSize="inherit" />
        {label}
      </div>
      <div className={`pdp-card-value${mono ? ' pdp-card-value--mono' : ''}`}>
        {value}
      </div>
    </div>
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
      const updated = await updateMapPoint(point.id, {
        name: name.trim(),
        number: number.trim(),
        description: description.trim() || undefined,
        category,
        longitude: point.longitude,
        latitude: point.latitude,
        xMercator: point.xMercator,
        yMercator: point.yMercator,
      });
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
      borderRadius: '10px',
      backgroundColor: '#fff',
    },
  };

  return (
    <>
      <Dialog
        className="pdp-dialog"
        open={open && !deleteOpen}
        onClose={submitting ? undefined : onClose}
        maxWidth="sm"
        fullWidth
      >
        {/* Header */}
        <div className="pdp-header">
          <div className="pdp-header-inner">
            <IconButton
              className="pdp-close"
              onClick={onClose}
              disabled={submitting}
              size="small"
              aria-label="Kapat"
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <span className="pdp-category-chip">
              <span className="pdp-category-dot" style={{ background: catColor }} />
              {catLabel}
            </span>

            <Typography
              variant="h6"
              sx={{
                mt: 1.5,
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.02em',
                pr: 4,
              }}
            >
              {editing ? 'Noktayı Düzenle' : point.name}
            </Typography>

            {!editing && (
              <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.25, fontSize: '0.85rem' }}>
                #{point.number}
              </Typography>
            )}
          </div>
        </div>

        <DialogContent className="pdp-body" sx={{ p: 0 }}>
          {!editing ? (
            <>
              <div className="pdp-grid">
                <InfoCard icon={TableChartIcon} label="Numara" value={point.number} />
                <InfoCard icon={LabelIcon} label="Kategori" value={catLabel} />
                <InfoCard
                  icon={MyLocationIcon}
                  label="EPSG:4326 (WGS84)"
                  value={fmt4326(point.longitude, point.latitude, 6)}
                  wide
                  mono
                />
                <InfoCard
                  icon={MyLocationIcon}
                  label="EPSG:3857 (Web Mercator)"
                  value={fmt3857(point.xMercator, point.yMercator)}
                  wide
                  mono
                />
                <InfoCard
                  icon={DescriptionIcon}
                  label="Açıklama"
                  value={point.description || 'Açıklama yok'}
                  wide
                />
                <InfoCard icon={AccessTimeIcon} label="Oluşturulma" value={fmtDate(point.createdAt)} wide />
              </div>

              {admin && (
                <div className="pdp-admin-section">
                  <div className="pdp-admin-title">
                    <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />
                    Ekleyen kullanıcı
                  </div>
                  <div className="pdp-grid">
                    <InfoCard
                      icon={PersonIcon}
                      label="Kullanıcı adı"
                      value={point.createdByUserName ?? '—'}
                    />
                    <InfoCard
                      icon={PersonIcon}
                      label="Görünen ad"
                      value={point.createdByDisplayName ?? '—'}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <Stack spacing={2}>
              <div className="pdp-coord-banner">
                <MyLocationIcon fontSize="small" />
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
                sx={fieldSx}
              />
              <TextField
                label="Numara"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                fullWidth
                disabled={submitting}
                sx={fieldSx}
              />
              <TextField
                select
                label="Kategori"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                disabled={submitting}
                sx={fieldSx}
              >
                {categories.map((c) => {
                  const n = c.name ?? c.Name;
                  return (
                    <MenuItem key={n} value={n}>
                      {c.displayName ?? c.DisplayName ?? n}
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
                sx={fieldSx}
              />
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions className="pdp-footer" sx={{ justifyContent: 'flex-end' }}>
          {!editing ? (
            <>
              <Button
                onClick={onClose}
                disabled={submitting}
                sx={{ textTransform: 'none', color: '#607d8b' }}
              >
                Kapat
              </Button>
              <Button
                className="pdp-btn-edit"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
                disabled={submitting}
              >
                Düzenle
              </Button>
              <Button
                className="pdp-btn-delete"
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteOpen(true)}
                disabled={submitting}
                sx={{ boxShadow: '0 4px 12px rgba(211, 47, 47, 0.35)' }}
              >
                Sil
              </Button>
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
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '10px',
                  px: 3,
                  boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
                }}
              >
                {submitting ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Silme onayı */}
      <Dialog
        className="pdp-delete-dialog"
        open={deleteOpen}
        onClose={() => !submitting && setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'error.light',
              color: 'error.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Noktayı silmek istiyor musunuz?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>{point.name}</strong> kaydı kalıcı olarak işaretlenecek ve haritadan kaldırılacak.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'center', gap: 1 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={submitting}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', minWidth: 100 }}
          >
            İptal
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={submitting}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              minWidth: 120,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(211, 47, 47, 0.35)',
            }}
          >
            {submitting ? 'Siliniyor…' : 'Evet, Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
