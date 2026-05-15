import axios from 'axios';

const TOKEN_KEY   = 'basarsoft_access_token';
const REFRESH_KEY = 'basarsoft_refresh_token';
const USER_KEY    = 'basarsoft_user';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5226';

const authHttp = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const FIELD_MAP = {
  UserName: 'userName',
  Password: 'password',
  DisplayName: 'displayName',
  PasswordConfirm: 'passwordConfirm',
};

function normalizeFieldErrors(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [key, messages] of Object.entries(raw)) {
    const field = FIELD_MAP[key] ?? key.charAt(0).toLowerCase() + key.slice(1);
    const msg = Array.isArray(messages) ? messages.find(Boolean) : messages;
    if (msg) out[field] = msg;
  }
  return out;
}

/** API / axios hatalarını Türkçe mesaj + alan bazlı hatalarla döndürür. */
export function parseApiError(error) {
  const body = error?.response?.data;
  const apiError = body?.error ?? body?.Error;

  const fieldErrors = normalizeFieldErrors(
    apiError?.validationErrors ?? apiError?.ValidationErrors ?? body?.errors,
  );

  let message = apiError?.message ?? apiError?.Message;

  if (!message || message === 'Doğrulama hatası.') {
    const firstField = Object.values(fieldErrors).find(Boolean);
    if (firstField) message = firstField;
  }

  if (!message && error?.response?.status === 401) {
    message = 'Kullanıcı adı veya şifre hatalı.';
  }

  if (!message && error?.response?.status === 400) {
    message = 'Lütfen işaretli alanları kontrol edin.';
  }

  if (!message && typeof body === 'string') message = body;

  if (!message) {
    message = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
  }

  const err = new Error(message);
  err.code = apiError?.code ?? apiError?.Code;
  err.status = error?.response?.status;
  err.fieldErrors = fieldErrors;
  return err;
}

authHttp.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(parseApiError(error)),
);

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'); }
  catch { return null; }
}

export function setTokens(accessToken, refreshToken, userData) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (userData)     localStorage.setItem(USER_KEY, JSON.stringify(userData));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function isAdmin() {
  const roles = getStoredUser()?.roles ?? [];
  return roles.some((r) => String(r).toLowerCase() === 'admin');
}

export function unwrap(response) {
  const body = response.data;
  if (body && typeof body.success === 'boolean') {
    if (!body.success) {
      throw parseApiError({ response: { data: body, status: response.status } });
    }
    return body.data;
  }
  return body;
}

export async function login(userName, password) {
  const response = await authHttp.post('/api/auth/login', { userName, password });
  const data = unwrap(response);
  const userData = {
    userName: data.userName || userName,
    displayName: data.displayName,
    roles: data.roles,
  };
  setTokens(data.accessToken, data.refreshToken, userData);
  return data;
}

export async function register(userName, password, displayName) {
  const response = await authHttp.post('/api/auth/register', {
    userName,
    password,
    displayName: displayName || undefined,
  });
  const data = unwrap(response);
  const userData = {
    userName: data.userName || userName,
    displayName: data.displayName,
    roles: data.roles,
  };
  setTokens(data.accessToken, data.refreshToken, userData);
  return data;
}

export function logout() {
  clearTokens();
}
