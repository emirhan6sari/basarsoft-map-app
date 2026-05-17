import axios from 'axios';
import {
  API_BASE_URL,
  clearTokens,
  getAccessToken,
  refreshSession,
} from './auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_SKIP = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

function isAuthEndpoint(url = '') {
  return AUTH_SKIP.some((path) => url.includes(path));
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const body = error?.response?.data;
    const status = error?.response?.status;
    const original = error.config;

    if (
      status === 401
      && original
      && !original._retry
      && !isAuthEndpoint(original.url)
      && getAccessToken()
    ) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return apiClient(original);
      } catch (refreshErr) {
        clearTokens();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshErr);
      }
    }

    console.error('[API hata]', status, body ?? error.message);
    return Promise.reject(error);
  },
);

export default apiClient;
