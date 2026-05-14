// ============================================================================
// App.jsx — Uygulamanın kök bileşeni
// ----------------------------------------------------------------------------
// Bu dosya uygulamanın ana iskeletini barındırır:
//   - Üstte bir AppBar (toolbar): başlık + butonlar (Add Point, Query Points, ...)
//   - Altta harita için ayrılmış bir alan (şu an placeholder)
//
// Sonraki adımlarda:
//   - Harita placeholder yerine gerçek OpenLayers haritası gelecek
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

/**
 * Uygulamanın kök bileşeni.
 * Şu an: statik bir iskelet (toolbar + placeholder harita alanı).
 * Sonraki adımlarda harita ve modal'lar entegre edilecek.
 */
function App() {
  // Geçici state: hangi modun aktif olduğunu tutacak (örn. "addPoint", "query").
  // Şimdilik kullanılmıyor, sadece toolbar tıklamasını test etmek için.
  const [activeMode, setActiveMode] = useState(null);

  // Toolbar butonu tıklandığında çağrılacak.
  // Şimdilik sadece state'i güncelliyor; ileride modal açma vb. yapacak.
  const handleToolbarAction = (mode) => {
    setActiveMode(mode);
    console.log('Toolbar action:', mode);
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

      {/* ===================== ALT KISIM: HARİTA ALANI ===================== */}
      {/* flexGrow: 1 → kalan dikey boşluğu tamamen doldurur (harita için kritik) */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e8eef3',
          color: '#456',
          position: 'relative',
        }}
      >
        <Stack alignItems="center" spacing={1}>
          <Typography variant="h5">Harita burada olacak</Typography>
          <Typography variant="body2">
            Bir sonraki adımda OpenLayers haritası bu alana yerleşecek.
          </Typography>
          {activeMode && (
            <Typography variant="caption" color="primary">
              (Test: son seçilen mod → <strong>{activeMode}</strong>)
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default App;
