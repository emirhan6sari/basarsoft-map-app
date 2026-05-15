// ============================================================================
// main.jsx — Uygulamanın giriş noktası (React 18 / 19 createRoot API)
// ----------------------------------------------------------------------------
// Burada:
//   - React DOM root oluşturulur (#root elementi index.html'de var)
//   - MUI ThemeProvider ve CssBaseline ile global stil sıfırlama yapılır
//   - OpenLayers'ın varsayılan CSS'i import edilir (controls için)
//   - <App /> bileşeni render edilir
// ============================================================================

import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { PrimeReactProvider } from 'primereact/api';

import App from './App.jsx';
import './index.css';
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
  <PrimeReactProvider value={{ appendTo: document.body, zIndex: { overlay: 2000 } }}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </PrimeReactProvider>,
);
