import axios from 'axios';
import { API_BASE_URL, getAccessToken } from './auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error?.response?.data;
    console.error('[API hata]', error?.response?.status, body ?? error.message);
    return Promise.reject(error);
  },
);

export default apiClient;
