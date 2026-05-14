// ============================================================================
// LayersPanel — Haritadaki katmanları listeler, görünürlüklerini açıp kapatır
// ----------------------------------------------------------------------------
// Ödev şartı (madde 9): "Uygulamada en az 2 katman bulunmalı. Kullanıcı bu
// katmanları açıp kapatabilmelidir."
//
// Davranış:
//   - Varsayılan KAPALI: SOL ALTTA sadece bir katman ikonu görünür.
//   - İkona tıklanınca panel yukarı doğru AÇILIR (genişler ve uzar);
//     içinde katman listesi (checkbox + isim) görünür.
//   - Tekrar tıklayınca / üst köşedeki kapatma ikonu ile KAPANIR.
//
// Konum: Haritanın SOL ALT köşesi.
// ============================================================================

import { useEffect, useState } from 'react';
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
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';

/**
 * @param {object} props
 * @param {import('ol/Map').default | null} props.map  OpenLayers harita örneği
 */
function LayersPanel({ map }) {
  // Panel açık mı? Varsayılan KAPALI; sadece ikon görünür.
  const [open, setOpen] = useState(false);

  // Katman görünürlüklerini local state'te tutuyoruz.
  // Format: { 'OpenStreetMap': true, 'Points': false, ... }
  const [visibilities, setVisibilities] = useState({});

  // Haritadaki katmanları okuyup state'i güncelle
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

    // Katman eklendiğinde / silindiğinde paneli yenile
    map.getLayers().on('add', refresh);
    map.getLayers().on('remove', refresh);

    return () => {
      map.getLayers().un('add', refresh);
      map.getLayers().un('remove', refresh);
    };
  }, [map]);

  /** Checkbox değiştiğinde ilgili OL katmanının görünürlüğünü değiştirir */
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

  const layerTitles = Object.keys(visibilities);

  return (
    // Konteyner: panel açıkken yukarıya doğru büyür (içerik arttıkça boyu artar);
    // ancak SOL alt köşesi sabit, çünkü bottom + left ile pinli.
    <Box
      sx={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 1000,
        // Açıkken minimum genişlik (önceki 220 → 280 ile biraz daha geniş)
        minWidth: open ? 280 : 'auto',
      }}
    >
      {/* MUI Collapse → genişleme/daralma animasyonu (height transition).
          collapsedSize: kapalıyken ikona yer açan minimum yükseklik. */}
      <Collapse
        in={open}
        timeout={250}
        collapsedSize={0}
        unmountOnExit
      >
        <Paper
          elevation={3}
          sx={{
            px: 2,
            py: 1.5,
            mb: 1, // ikon ile arasında boşluk
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderRadius: 2,
          }}
        >
          {/* Başlık ve X ikonu kaldırıldı — kullanıcı panelin sadece
              katman listesini görmesini istedi. Panel, alt-soldaki katman
              ikonuna tekrar tıklayarak (toggle) kapatılır. */}

          {/* Katman listesi (her biri için bir checkbox) */}
          <Stack spacing={0.25}>
            {layerTitles.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                (henüz katman yok)
              </Typography>
            ) : (
              layerTitles.map((title) => (
                <FormControlLabel
                  key={title}
                  control={
                    <Checkbox
                      checked={visibilities[title]}
                      onChange={() => handleToggle(title)}
                    />
                  }
                  label={<Typography variant="body1">{title}</Typography>}
                  sx={{ ml: 0, mr: 0 }}
                />
              ))
            )}
          </Stack>
        </Paper>
      </Collapse>

      {/* Tetikleyici ikon — Collapse'in ALTINDA, hep aynı yerde (SOL ALT) durur;
          panel onun üzerinde yukarıya doğru açılır. */}
      <Paper
        elevation={3}
        sx={{
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          width: 'fit-content',
          // İkon panelin SOL tarafına hizalansın
          mr: 'auto',
        }}
      >
        <Tooltip title={open ? 'Katmanları kapat' : 'Katmanları göster'} placement="right">
          <IconButton
            onClick={() => setOpen((prev) => !prev)}
            aria-haspopup="dialog"
            aria-expanded={open ? 'true' : undefined}
            color={open ? 'primary' : 'default'}
            size="large"
            sx={{
              // Biraz daha iri ikon (daha kolay tıklanır, görsel olarak da daha vurgulu)
              '& svg': { fontSize: 28 },
            }}
          >
            <LayersIcon />
          </IconButton>
        </Tooltip>
      </Paper>
    </Box>
  );
}

export default LayersPanel;
