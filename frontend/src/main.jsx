// ============================================================================
// main.jsx — Uygulamanın giriş noktası (React 18 / 19 createRoot API)
// ----------------------------------------------------------------------------
// Burada:
//   - React DOM root oluşturulur (#root elementi index.html'de var)
//   - MUI ThemeProvider ve CssBaseline ile global stil sıfırlama yapılır
//   - OpenLayers'ın varsayılan CSS'i import edilir (controls için)
//   - <App /> bileşeni render edilir
// ============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import App from './App.jsx';
import './index.css';
// OpenLayers'ın hazır kontrol stilleri (zoom butonları, attribution vb.).
// İleride harita eklediğimizde bu CSS'in import edilmiş olması gerekiyor.
import 'ol/ol.css';

// Basit bir MUI tema. Renkleri uygulamanın "kurumsal" havasını korumak için
// nötr tutuyoruz. Sonraki adımda customize edebiliriz (font, palette vb.).
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // MUI varsayılan mavisi; istenirse kurumsal renge çekilir
    },
  },
  shape: {
    borderRadius: 6,
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline: tarayıcılar arası tutarlı bir başlangıç (CSS reset).
          Margin/padding sıfırlar, body'ye font-family uygular. */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
