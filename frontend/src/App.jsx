// ============================================================================
// App.jsx — Uygulamanın kök bileşeni
// ----------------------------------------------------------------------------
// Tasarım:
//   - Harita tüm ekranı kaplar (TAM EKRAN); AppBar yok.
//   - Üst ortada minimal bir "açılır menü" ikonu (ok) duruyor; tıklayınca
//     içerden Add Point / Query Points / Layers seçenekleri çıkıyor.
//   - Harita çevresine yerleştirilmiş kontroller (CoordinateBox, LayersPanel)
//     MapView içinde absolute olarak konumlanıyor.
//
// Bu yapı kullanıcının ekranını rahatlatıyor — toolbar şişkinliği yok,
// yalnızca aksiyon istendiğinde menü açılıyor.
// ============================================================================

import { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  IconButton,
  Button,
  Popover,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import TableChartIcon from '@mui/icons-material/TableChart';
import LayersIcon from '@mui/icons-material/Layers';

import MapView from './components/MapView';

/**
 * Menü öğesinin tanımı. Her aksiyon için tek bir kayıt:
 *   - mode: state'e yazılacak değer (ileride hangi modal/aracın açılacağını belirleyecek)
 *   - label: kullanıcıya görünen yazı
 *   - icon: solda gösterilecek MUI ikonu
 */
const MENU_ITEMS = [
  { mode: 'addPoint',    label: 'Add Point',    Icon: AddLocationAltIcon },
  { mode: 'queryPoints', label: 'Query Points', Icon: TableChartIcon },
  { mode: 'layers',      label: 'Layers',       Icon: LayersIcon },
];

function App() {
  // Hangi modun aktif olduğunu tutar (placeholder; ileride modal açma vs.)
  const [, setActiveMode] = useState(null);

  // MUI Menu'nün hangi elemana yapışıp açılacağını tutuyoruz.
  // null → menü kapalı, HTML element → o elemanın altına açık
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  const openMenu = (event) => setMenuAnchor(event.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const handleMenuItemClick = (mode) => {
    setActiveMode(mode);
    closeMenu();
    console.log('Toolbar action:', mode, '(henüz implemente edilmedi)');
  };

  return (
    // Tüm ekran; harita için tek konteyner.
    // overflow: hidden → tarayıcı kaydırma çubuğu çıkmasın
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Asıl içerik: harita + üstündeki tüm overlay'ler (koordinat, katmanlar) */}
      <MapView />

      {/* ÜST ORTA: floating menü ikonu (tıklayınca dropdown açar) */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
        }}
      >
        {/* Sade ikon — üzerinde tooltip yok (kullanıcı isteği).
            Erişilebilirlik için aria-label korunuyor. */}
        <IconButton
          onClick={openMenu}
          aria-label="Menü"
          aria-haspopup="menu"
          aria-expanded={menuOpen ? 'true' : undefined}
          size="medium"
          sx={{
            // Menü açıkken ok yukarı dönsün (kapalı/açık görsel ipucu)
            transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <KeyboardArrowDownIcon />
        </IconButton>
      </Paper>

      {/* MUI Popover — Paper'ın altına ortalanmış olarak açılır.
          İçeride Stack direction="row" ile YATAY buton dizimi var
          (klasik dikey Menu yerine kompakt, çubuk benzeri bir görünüm). */}
      <Popover
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: { sx: { mt: 0.5, borderRadius: 2, overflow: 'visible' } },
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ p: 0.75 }}>
          {MENU_ITEMS.map(({ mode, label, Icon }) => (
            <Button
              key={mode}
              onClick={() => handleMenuItemClick(mode)}
              startIcon={<Icon />}
              size="small"
              color="inherit"
              sx={{
                textTransform: 'none',
                whiteSpace: 'nowrap',
                px: 1.5,
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Popover>
    </Box>
  );
}

export default App;
