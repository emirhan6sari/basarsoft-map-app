// ============================================================================
// API client — backend ile konuşmak için tek bir axios örneği
// ----------------------------------------------------------------------------
// Neden tek bir merkezi client?
//   - baseURL, timeout, interceptors (auth header, error log, vs.) bir kez
//     tanımlanır; her sayfa/komponent kendi axios call'ını yapmaz.
//   - VITE_API_BASE_URL ortam değişkeni ile yerel ve canlı (Railway) ortam
//     arasında tek satır değişiklikle geçiş yapılabilir.
// ============================================================================

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5226';

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// İleride global hata yönetimi (toast vs.) buradan eklenebilir.
// Şimdilik geliştirme kolaylığı için sadece konsola yazıyoruz.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API hata]', error?.response?.status, error?.response?.data ?? error.message);
    return Promise.reject(error);
  },
);

export default apiClient;
