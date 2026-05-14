// ============================================================================
// LayersPanel — Haritadaki katmanları listeler, görünürlüklerini açıp kapatır
// ----------------------------------------------------------------------------
// Ödev şartı (madde 9): "Uygulamada en az 2 katman bulunmalı. Kullanıcı bu
// katmanları açıp kapatabilmelidir."
//
// Konum: Haritanın SAĞ ALT köşesinde, küçük şeffaf bir panel.
// Şu an sadece OSM katmanı var (madde 1); ileride nokta katmanı ve yardımcı
// katman (Türkiye il sınırları vb.) eklendiğinde otomatik olarak burada
// görünecekler — çünkü panel "map.getLayers()" üzerinden dinamik listeleme yapıyor.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  Paper,
  Stack,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';

/**
 * @param {object} props
 * @param {import('ol/Map').default | null} props.map  OpenLayers harita örneği
 */
function LayersPanel({ map }) {
  // Katman görünürlüklerini local state'te tutuyoruz ki checkbox'lar
  // controlled component olarak çalışsın ve UI değişimi anında yansısın.
  // Format: { 'OpenStreetMap': true, 'Points': false, ... }
  const [visibilities, setVisibilities] = useState({});

  // Harita ilk hazır olduğunda mevcut katmanları okuyup state'e yaz
  useEffect(() => {
    if (!map) return;

    const initial = {};
    map.getLayers().forEach((layer) => {
      const title = layer.get('title') ?? 'İsimsiz katman';
      initial[title] = layer.getVisible();
    });
    setVisibilities(initial);

    // Yeni katman eklendiğinde / silindiğinde paneli yenile
    const handleLayersChange = () => {
      const updated = {};
      map.getLayers().forEach((layer) => {
        const title = layer.get('title') ?? 'İsimsiz katman';
        updated[title] = layer.getVisible();
      });
      setVisibilities(updated);
    };
    map.getLayers().on('add', handleLayersChange);
    map.getLayers().on('remove', handleLayersChange);

    return () => {
      map.getLayers().un('add', handleLayersChange);
      map.getLayers().un('remove', handleLayersChange);
    };
  }, [map]);

  /**
   * Checkbox değiştiğinde ilgili OpenLayers katmanının görünürlüğünü değiştirir
   * ve state'i günceller.
   */
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

  // Harita henüz hazır değilse hiçbir şey gösterme
  if (!map) return null;

  const layerTitles = Object.keys(visibilities);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        px: 1.5,
        py: 1,
        minWidth: 180,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        zIndex: 1000,
      }}
    >
      {/* Başlık: küçük bir ikon + "Katmanlar" yazısı */}
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
        <LayersIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight="bold">
          Katmanlar
        </Typography>
      </Stack>

      {/* Katman listesi: her biri için bir checkbox */}
      <Stack spacing={0}>
        {layerTitles.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            (henüz katman yok)
          </Typography>
        ) : (
          layerTitles.map((title) => (
            <FormControlLabel
              key={title}
              control={
                <Checkbox
                  size="small"
                  checked={visibilities[title]}
                  onChange={() => handleToggle(title)}
                />
              }
              label={
                <Typography variant="body2">{title}</Typography>
              }
              sx={{ ml: 0, mr: 0 }}
            />
          ))
        )}
      </Stack>
    </Paper>
  );
}

export default LayersPanel;
