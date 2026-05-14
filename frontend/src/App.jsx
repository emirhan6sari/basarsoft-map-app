// ============================================================================
// App.jsx — Uygulamanın kök bileşeni
// ----------------------------------------------------------------------------
// Bu dosya uygulamanın ana iskeletini barındırır:
//   - Üstte bir AppBar (toolbar): solda başlık, ortada AÇILIR MENÜ butonu
//   - Altta MapView bileşeni: OpenLayers haritası + alt orta koordinat
//     göstergesi + sağ alt katman paneli
//
// Açılır menü, eskiden toolbar'da yan yana duran (Add Point / Query Points /
// Layers) butonlarını tek bir "Menu" buton + dropdown içine taşıdı.
// Bu sayede toolbar daha temiz, ileride mod sayısı arttıkça da büyümeyecek.
// ============================================================================

import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  // Hangi modun aktif olduğunu tutar (örn. "addPoint", "queryPoints", "layers").
  // Şu an sadece bilgilendirme amaçlı; ileride modal açma/araç aktif etme
  // mantığına bağlanacak.
  const [activeMode, setActiveMode] = useState(null);

  // Menü açık/kapalı durumu. MUI Menu, "anchorEl" ile konumlanır:
  //   null  → menü kapalı
  //   bir HTML element → menü o elemente yapışık açılır
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  /** Trigger button tıklanınca menüyü aç */
  const openMenu = (event) => setMenuAnchor(event.currentTarget);

  /** Menüyü kapat (dışarı tıklama veya ESC) */
  const closeMenu = () => setMenuAnchor(null);

  /** Bir menü öğesine tıklanınca: modu ayarla + menüyü kapat */
  const handleMenuItemClick = (mode) => {
    setActiveMode(mode);
    closeMenu();
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
      {/* ===================== ÜST KISIM: TOOLBAR + AÇILIR MENÜ ===================== */}
      <AppBar position="static" color="primary" elevation={2}>
        {/* Toolbar'ı 3 sütuna bölüyoruz:
            sol → başlık
            orta → menü trigger butonu (resimde işaretlenen merkez konum)
            sağ → boş (gelecekte kullanıcı/dil/tema butonları için yer) */}
        <Toolbar sx={{ display: 'flex', alignItems: 'center' }}>
          {/* SOL: Başlık */}
          <Box sx={{ flex: '1 1 0', display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="div">
              Başarsoft Map App
              {activeMode && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ ml: 2, opacity: 0.85 }}
                >
                  (mod: {activeMode})
                </Typography>
              )}
            </Typography>
          </Box>

          {/* ORTA: Açılır menü trigger butonu */}
          <Box sx={{ flex: '0 0 auto' }}>
            <Button
              color="inherit"
              onClick={openMenu}
              endIcon={<KeyboardArrowDownIcon />}
              aria-haspopup="menu"
              aria-expanded={menuOpen ? 'true' : undefined}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Menu
            </Button>

            {/* MUI Menu: anchorEl, butonun altına konumlanır */}
            <Menu
              anchorEl={menuAnchor}
              open={menuOpen}
              onClose={closeMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              slotProps={{
                paper: { sx: { minWidth: 200, mt: 0.5 } },
              }}
            >
              {MENU_ITEMS.map(({ mode, label, Icon }) => (
                <MenuItem key={mode} onClick={() => handleMenuItemClick(mode)}>
                  <ListItemIcon>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{label}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* SAĞ: dengeyi sağlayan boş alan (başlık ile simetri için) */}
          <Box sx={{ flex: '1 1 0' }} />
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
