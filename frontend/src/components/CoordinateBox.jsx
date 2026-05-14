// ============================================================================
// CoordinateBox — Mouse'un harita üzerindeki anlık koordinatlarını gösterir
// ----------------------------------------------------------------------------
// Ödev şartı (madde 1): "Harita üzerinde mouse konumuna göre anlık koordinat
// gösterimi yapılmalıdır."
//
// Konum: Haritanın ALT ORTASINDA, yatay (lon ve lat yan yana) bir bant.
//
// Tasarım notu (KRİTİK):
//   - Lon ve Lat değerleri SABİT GENİŞLİKLİ kutular içinde gösteriliyor.
//   - Bu sayede değer "—" iken veya "35.12345" iken layout ASLA kaymıyor;
//     ortadaki dikey ayraç hep tam merkezde duruyor.
//   - Yazı tipi: monospace (her karakter eşit genişlik) + textAlign: left
//     (sayılar ondalık noktası hizasında olmasa da, sabit kutu boyutu
//     sayesinde divider sabit kalıyor).
// ============================================================================

import { Paper, Stack, Divider, Box } from '@mui/material';

// Her bir koordinat alanı için sabit genişlik (px). Burası 9 karakter
// "-123.45678" sığacak şekilde seçildi; 5 ondalık + tam sayı + işaret + ° + boşluk.
const VALUE_BOX_WIDTH = 160;

/**
 * @param {object} props
 * @param {{ lon: number, lat: number } | null} props.lonLat  EPSG:4326
 */
function CoordinateBox({ lonLat }) {
  // İlk açılışta lonLat null gelirse "—" göster.
  // Fare bir kere haritaya girdikten sonra son değer kalıcı kalır
  // (MapView artık dışarı çıkışta null'a sıfırlamıyor).
  const lonStr = lonLat ? lonLat.lon.toFixed(5) : '—';
  const latStr = lonLat ? lonLat.lat.toFixed(5) : '—';

  return (
    <Paper
      elevation={3}
      sx={{
        // Konum: harita konteynerinin alt ortası
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',

        px: 2,
        py: 0.75,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        pointerEvents: 'none', // fare etkileşimini engellemesin
        zIndex: 1000,
      }}
    >
      {/* Yatay düzen: SABİT genişlikte iki kutu + ortada dikey ayraç.
          Stack'in spacing'i ile değil, iç Box'ların minWidth'i ile sabitleme. */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        divider={<Divider orientation="vertical" flexItem />}
      >
        <Box
          sx={{
            minWidth: VALUE_BOX_WIDTH,
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: '0.95rem',
          }}
        >
          <Box component="span" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            Lon:
          </Box>{' '}
          {lonStr}°
        </Box>

        <Box
          sx={{
            minWidth: VALUE_BOX_WIDTH,
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: '0.95rem',
          }}
        >
          <Box component="span" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            Lat:
          </Box>{' '}
          {latStr}°
        </Box>
      </Stack>
    </Paper>
  );
}

export default CoordinateBox;
