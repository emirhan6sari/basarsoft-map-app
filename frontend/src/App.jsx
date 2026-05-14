// ============================================================================
// App.jsx — Uygulamanın kök bileşeni
// ----------------------------------------------------------------------------
// Bu dosya uygulamanın ana iskeletini barındırır:
//   - Üstte bir AppBar (toolbar): başlık + butonlar (Add Point, Query Points, ...)
//   - Altta MapView bileşeni: OpenLayers haritası
//
// Sonraki adımlarda:
//   - Butonlar ilgili modal / araçları açacak (nokta ekleme, sorgu vb.)
//   - Backend API çağrıları axios üzerinden yapılacak
// ============================================================================

import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Stack,
} from '@mui/material';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import TableChartIcon from '@mui/icons-material/TableChart';
import LayersIcon from '@mui/icons-material/Layers';

import MapView from './components/MapView';

/**
 * Uygulamanın kök bileşeni.
 * Toolbar + harita layout'unu kurar.
 */
function App() {
  // Geçici state: hangi modun aktif olduğunu tutacak (örn. "addPoint", "query").
  // Şimdilik kullanılmıyor, sadece toolbar tıklamasını test etmek için.
  const [activeMode, setActiveMode] = useState(null);

  // Toolbar butonu tıklandığında çağrılacak.
  // Şimdilik sadece state'i güncelliyor; ileride modal açma vb. yapacak.
  const handleToolbarAction = (mode) => {
    setActiveMode(mode);
    console.log('Toolbar action:', mode, '(henüz implemente edilmedi)');
  };

  return (
    // Tüm ekranı kaplayan dikey flex konteyner.
    // height: 100vh → viewport yüksekliği, böylece harita "geri kalan boşluğu" tam doldurur.
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
      }}
    >
      {/* ===================== ÜST KISIM: TOOLBAR ===================== */}
      <AppBar position="static" color="primary" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Başarsoft Map App
            {activeMode && (
              <Typography component="span" variant="caption" sx={{ ml: 2, opacity: 0.8 }}>
                (mod: {activeMode})
              </Typography>
            )}
          </Typography>

          {/* Toolbar butonları — şu an placeholder; ileride gerçek aksiyonlara bağlanacak */}
          <Stack direction="row" spacing={1}>
            <Button
              color="inherit"
              startIcon={<AddLocationAltIcon />}
              onClick={() => handleToolbarAction('addPoint')}
            >
              Add Point
            </Button>
            <Button
              color="inherit"
              startIcon={<TableChartIcon />}
              onClick={() => handleToolbarAction('queryPoints')}
            >
              Query Points
            </Button>
            <Button
              color="inherit"
              startIcon={<LayersIcon />}
              onClick={() => handleToolbarAction('layers')}
            >
              Layers
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ===================== ALT KISIM: HARİTA ===================== */}
      {/* flexGrow: 1 → kalan dikey boşluğu tamamen doldurur (harita için kritik) */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <MapView />
      </Box>
    </Box>
  );
}

export default App;
