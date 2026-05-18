import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../api/categories';
import { parseApiError } from '../api/auth';
import { sortCategories } from '../utils/categoryUtils';
import './CategoryManageModal.css';

/** Tablo satırları — sıra numarasına göre */
function sortRows(rows) {
  return sortCategories(rows);
}

/** Boş liste → 1; dolu liste → max(sıra) + 1 */
function suggestNextSortOrder(rows) {
  if (!rows.length) return 1;
  return Math.max(...rows.map((r) => r.sortOrder)) + 1;
}

function buildEmptyForm(rows) {
  return { name: '', displayName: '', sortOrder: String(suggestNextSortOrder(rows)) };
}

export default function CategoryManageModal({ open, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(buildEmptyForm([]));
  const [editingId, setEditingId] = useState(null);
  const editingIdRef = useRef(null);
  editingIdRef.current = editingId;

  const sortedRows = useMemo(() => sortRows(rows), [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCategories();
      const list = sortRows(data ?? []);
      setRows(list);
      if (!editingIdRef.current) {
        setForm(buildEmptyForm(list));
      }
    } catch (err) {
      setError(err.message ?? 'Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setForm(buildEmptyForm([]));
      load();
    }
  }, [open, load]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(buildEmptyForm(rows));
  }, [rows]);

  /** Aynı sıra numarası başka kategorideyse kayıt engellenir (sunucu da 409 döner) */
  const validateSortOrder = (sortOrder, idToExclude) => {
    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
      return 'Sıra numarası en az 1 olmalıdır.';
    }
    const conflict = rows.find((r) => r.sortOrder === sortOrder && r.id !== idToExclude);
    if (conflict) {
      return `Sıra ${sortOrder} zaten "${conflict.displayName}" kategorisinde kullanılıyor.`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const sortOrder = Number.parseInt(form.sortOrder, 10);
    const sortError = validateSortOrder(sortOrder, editingId);
    if (sortError) {
      setError(sortError);
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      displayName: form.displayName.trim() || null,
      sortOrder,
    };

    try {
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      setEditingId(null);
      const data = await fetchCategories();
      const list = sortRows(data ?? []);
      setRows(list);
      setForm(buildEmptyForm(list));
      onChanged?.();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      displayName: row.displayName,
      sortOrder: String(row.sortOrder),
    });
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`"${row.displayName}" kategorisi silinsin mi?`)) return;
    setError('');
    try {
      await deleteCategory(row.id);
      if (editingId === row.id) setEditingId(null);
      const data = await fetchCategories();
      const list = sortRows(data ?? []);
      setRows(list);
      setForm(buildEmptyForm(list));
      onChanged?.();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth className="cm-dialog">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
        <Typography component="span" variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
          Kategori Yönetimi
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'inherit' }} aria-label="Kapat">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sıra numaraları benzersiz olmalıdır (1&apos;den başlar). Kullanımda olan kategori silinemez.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} className="cm-form-row">
          <TextField
            label="Kod (Name)"
            size="small"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={saving}
            helperText="Haritada kayıtlı değer (ör. Depo)"
          />
          <TextField
            label="Görünen ad"
            size="small"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            disabled={saving}
          />
          <TextField
            label="Sıra"
            size="small"
            type="number"
            required
            inputProps={{ min: 1, step: 1 }}
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            disabled={saving}
            helperText={editingId ? 'Başka kategoride kullanılan sıra kabul edilmez' : `Önerilen: ${suggestNextSortOrder(rows)}`}
          />
          <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
            <Button type="submit" variant="contained" size="small" disabled={saving} startIcon={<AddIcon />}>
              {editingId ? 'Güncelle' : 'Ekle'}
            </Button>
            {editingId && (
              <Button type="button" size="small" onClick={resetForm} disabled={saving}>
                İptal
              </Button>
            )}
          </Stack>
        </Box>

        <Box className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Sıra</th>
                <th>Kod</th>
                <th>Görünen ad</th>
                <th aria-label="İşlemler" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4}>Yükleniyor…</td>
                </tr>
              )}
              {!loading && sortedRows.length === 0 && (
                <tr>
                  <td colSpan={4}>Kayıt yok.</td>
                </tr>
              )}
              {!loading && sortedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sortOrder}</td>
                  <td>{row.name}</td>
                  <td>{row.displayName}</td>
                  <td>
                    <Box className="cm-actions">
                      <IconButton size="small" aria-label="Düzenle" onClick={() => startEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Sil" color="error" onClick={() => handleDelete(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
}
