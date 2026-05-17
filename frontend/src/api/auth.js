import axios from 'axios';

const TOKEN_KEY = 'basarsoft_access_token';
const REFRESH_KEY = 'basarsoft_refresh_token';
const USER_KEY = 'basarsoft_user';
const ACCESS_EXPIRES_KEY = 'basarsoft_access_expires';

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

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'); }
  catch { return null; }
}

function persistAuthResponse(data, fallbackUserName) {
  const userData = {
    userName: data.userName || fallbackUserName,
    displayName: data.displayName,
    roles: data.roles ?? [],
  };
  setTokens(data.accessToken, data.refreshToken, userData, data.accessTokenExpiresAt);
  return userData;
}

export function setTokens(accessToken, refreshToken, userData, accessExpiresAt) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (userData) localStorage.setItem(USER_KEY, JSON.stringify(userData));
  if (accessExpiresAt) {
    localStorage.setItem(ACCESS_EXPIRES_KEY, String(accessExpiresAt));
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function isAdmin() {
  const roles = getStoredUser()?.roles ?? [];
  return roles.some((r) => String(r).toLowerCase() === 'admin');
}

function isAccessTokenExpired(skewMs = 30_000) {
  const raw = localStorage.getItem(ACCESS_EXPIRES_KEY);
  if (!raw) return false;
  const expires = Date.parse(raw);
  if (Number.isNaN(expires)) return false;
  return Date.now() >= expires - skewMs;
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

function applyProfile(profile) {
  const userData = {
    userName: profile.userName,
    displayName: profile.displayName,
    roles: profile.roles ?? [],
  };
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
  return userData;
}

export async function fetchMe() {
  const token = getAccessToken();
  if (!token) return null;

  const response = await authHttp.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile = unwrap(response);
  return applyProfile(profile);
}

let refreshInFlight = null;

export async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('Oturum süresi doldu.');
  }

  if (!refreshInFlight) {
    refreshInFlight = authHttp
      .post('/api/auth/refresh', { refreshToken })
      .then((response) => {
        const data = unwrap(response);
        const user = getStoredUser();
        persistAuthResponse(data, user?.userName);
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

/**
 * Sayfa yüklenince oturumu doğrular; access süresi dolmuşsa refresh dener.
 * @returns {Promise<boolean>} geçerli oturum var mı
 */
export async function restoreSession() {
  const refreshToken = getRefreshToken();
  if (!getAccessToken() && !refreshToken) return false;

  try {
    if (isAccessTokenExpired() && refreshToken) {
      await refreshSession();
    }
    await fetchMe();
    return true;
  } catch {
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
    return false;
  }
}

export async function login(userName, password) {
  const response = await authHttp.post('/api/auth/login', { userName, password });
  const data = unwrap(response);
  persistAuthResponse(data, userName);
  return data;
}

export async function register(userName, password, displayName) {
  const response = await authHttp.post('/api/auth/register', {
    userName,
    password,
    displayName: displayName || undefined,
  });
  const data = unwrap(response);
  persistAuthResponse(data, userName);
  return data;
}

export async function logout() {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  try {
    if (token) {
      await authHttp.post(
        '/api/auth/logout',
        refreshToken ? { refreshToken } : {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    }
  } catch {
    // Sunucu hatası olsa bile istemci oturumunu kapat
  } finally {
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }
}
