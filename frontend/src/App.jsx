import { useState, useCallback, useEffect } from 'react';
import {
  Box, Paper, Stack, IconButton, Button, Popover,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddLocationAltIcon    from '@mui/icons-material/AddLocationAlt';
import TableChartIcon        from '@mui/icons-material/TableChart';
import LayersIcon            from '@mui/icons-material/Layers';
import TravelExploreIcon     from '@mui/icons-material/TravelExplore';
import UploadFileIcon        from '@mui/icons-material/UploadFile';
import StraightenIcon        from '@mui/icons-material/Straighten';

import MapView      from './components/MapView';
import LoginOverlay from './components/LoginOverlay';
import { isAuthenticated, restoreSession } from './api/auth';

const MENU_ITEMS = [
  { mode: 'addPoint',    label: 'Nokta Ekle',     Icon: AddLocationAltIcon },
  { mode: 'import',      label: 'İçe Aktar',      Icon: UploadFileIcon },
  { mode: 'measure',     label: 'Ölçüm',          Icon: StraightenIcon },
  { mode: 'queryPoints', label: 'Sorgula',        Icon: TableChartIcon },
  { mode: 'spatial',     label: 'Mekansal Sorgu', Icon: TravelExploreIcon },
  { mode: 'layers',      label: 'Katmanlar',      Icon: LayersIcon },
];

function App() {
  const [activeMode, setActiveMode]   = useState(null);
  const [menuAnchor, setMenuAnchor]   = useState(null);
  // Auth state: her login/logout'ta MapView'i yeniden render için kullanılır
  const [authKey, setAuthKey]         = useState(0);
  const menuOpen = Boolean(menuAnchor);

  const openMenu  = (e) => setMenuAnchor(e.currentTarget);
  const closeMenu = ()  => setMenuAnchor(null);

  const handleMenuItemClick = (mode) => {
    // Giriş yapılmamışsa menü eylemlerini engelle
    if (!isAuthenticated()) return;
    setActiveMode(mode);
    closeMenu();
  };

  const handleModeConsumed = () => setActiveMode(null);

  const handleAuthChange = useCallback(() => {
    setAuthKey(k => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    restoreSession().then((ok) => {
      if (alive && ok) setAuthKey((k) => k + 1);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onSessionExpired = () => setAuthKey((k) => k + 1);
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || !menuOpen) return;
      closeMenu();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Harita — key değişince noktaları yeniden yükler */}
      <MapView key={authKey} activeMode={activeMode} onModeConsumed={handleModeConsumed} />

      {/* ÜST ORTA: floating menü */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1100, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.96)',
        }}
      >
        <IconButton
          onClick={openMenu}
          aria-label="Menü"
          size="medium"
          sx={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
        >
          <KeyboardArrowDownIcon />
        </IconButton>
      </Paper>

      <Popover
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 2 } } }}
      >
        <Stack direction="row" spacing={0.5} sx={{ p: 0.75 }}>
          {MENU_ITEMS.map(({ mode, label, Icon }) => (
            <Button
              key={mode}
              onClick={() => handleMenuItemClick(mode)}
              startIcon={<Icon />}
              size="small"
              color="inherit"
              disabled={!isAuthenticated()}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap', px: 1.5 }}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Popover>

      {/* SAĞ ÜST: Giriş / Profil */}
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1100 }}>
        <LoginOverlay onAuthChange={handleAuthChange} authRevision={authKey} />
      </Box>
    </Box>
  );
}

export default App;
