import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';
import { API_BASE } from '../config';

const COOKIE_STORAGE_KEY = 'server-monitor-session-cookie';
let cookieReady = null;
let lastSessionMeta = { hasSession: false, sessionLen: 0, names: [] };

export function getCookieHeader() {
  return lastSessionMeta.hasSession ? '[native-session]' : '';
}

function isUsableCookieValue(value) {
  if (value == null) return false;
  const trimmed = String(value).trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return false;
  if (trimmed === 'deleted' || trimmed === 'null' || trimmed === 'undefined') return false;
  return true;
}

function cookieDebug(cookies) {
  const names = Object.keys(cookies || {});
  const session = cookies?.sessionid?.value;
  const csrf = cookies?.csrftoken?.value || cookies?.csrf?.value;
  return {
    names,
    hasSession: isUsableCookieValue(session),
    sessionLen: isUsableCookieValue(session) ? String(session).length : 0,
    hasCsrf: isUsableCookieValue(csrf),
  };
}

async function readNativeCookies() {
  const merged = {};
  try {
    const fromUrl = await CookieManager.get(API_BASE, false);
    Object.assign(merged, fromUrl || {});
  } catch {
    // ignore
  }
  try {
    const all = await CookieManager.getAll(false);
    Object.values(all || {}).forEach(cookie => {
      const domain = String(cookie?.domain || '');
      if (
        cookie?.name &&
        (domain.includes('meon.co.in') || domain.includes('meonheartbeat') || !domain)
      ) {
        merged[cookie.name] = cookie;
      }
    });
  } catch {
    // ignore
  }
  lastSessionMeta = cookieDebug(merged);
  return merged;
}

async function persistNativeSession() {
  const cookies = await readNativeCookies();
  const session = cookies?.sessionid?.value;
  try {
    if (isUsableCookieValue(session)) {
      // Store only sessionid for restore. Never send this as a request Cookie header.
      await AsyncStorage.setItem(COOKIE_STORAGE_KEY, `sessionid=${String(session).trim()}`);
    } else {
      await AsyncStorage.removeItem(COOKIE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return lastSessionMeta;
}

async function restoreSessionToNative() {
  try {
    const stored = await AsyncStorage.getItem(COOKIE_STORAGE_KEY);
    if (!stored) return;
    const match = stored.match(/sessionid=([^;]+)/);
    const value = match?.[1]?.trim();
    if (!isUsableCookieValue(value)) {
      await AsyncStorage.removeItem(COOKIE_STORAGE_KEY);
      return;
    }
    const host = API_BASE.replace(/^https?:\/\//, '').split('/')[0];
    await CookieManager.set(
      API_BASE,
      {
        name: 'sessionid',
        value,
        domain: host,
        path: '/',
        version: '1',
      },
      false,
    );
  } catch {
    // ignore
  }
}

export async function hydrateSessionCookies() {
  if (!cookieReady) {
    cookieReady = (async () => {
      await restoreSessionToNative();
      await readNativeCookies();
    })();
  }
  await cookieReady;
  return lastSessionMeta;
}

export async function clearSessionCookies() {
  cookieReady = null;
  lastSessionMeta = { hasSession: false, sessionLen: 0, names: [] };
  try {
    await AsyncStorage.removeItem(COOKIE_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    await CookieManager.clearAll(false);
  } catch {
    // ignore
  }
  try {
    await CookieManager.clearAll(true);
  } catch {
    // ignore
  }
}

function redactSensitive(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(redactSensitive(JSON.parse(value)));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value === 'object') {
    const next = {};
    Object.keys(value).forEach(key => {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower === 'cookie' ||
        lower === 'sessionid'
      ) {
        next[key] = '***';
      } else {
        next[key] = redactSensitive(value[key]);
      }
    });
    return next;
  }
  return value;
}

function readSetCookie(response) {
  if (!response?.headers) return '';
  if (typeof response.headers.getSetCookie === 'function') {
    const list = response.headers.getSetCookie();
    if (Array.isArray(list) && list.length) return list.join('\n');
  }
  const raw =
    response.headers.get?.('set-cookie') ||
    response.headers.get?.('Set-Cookie') ||
    response.headers.map?.['set-cookie'] ||
    response.headers.map?.['Set-Cookie'];
  if (Array.isArray(raw)) return raw.join('\n');
  return raw || '';
}

async function ingestSetCookie(response, url) {
  const raw = readSetCookie(response);
  if (!raw) return;
  // iOS may collapse multiple Set-Cookie into one string; feed each line/chunk.
  const chunks = String(raw)
    .split(/\n|(?:,(?=\s*[^;=]+=[^;]+))/)
    .map(part => part.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    try {
      await CookieManager.setFromResponse(url, chunk);
    } catch {
      // ignore
    }
  }
}

export function normalizeList(data, keys = ['users', 'results', 'items', 'data', 'recipients']) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

async function getCsrfToken() {
  let cookies = await readNativeCookies();
  let raw =
    cookies?.csrftoken?.value ||
    cookies?.csrf?.value ||
    cookies?.['csrf-token']?.value ||
    '';

  // Django often sets csrftoken only after a safe GET — warm it if missing.
  if (!isUsableCookieValue(raw) && lastSessionMeta.hasSession) {
    try {
      await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      cookies = await readNativeCookies();
      raw =
        cookies?.csrftoken?.value ||
        cookies?.csrf?.value ||
        cookies?.['csrf-token']?.value ||
        '';
    } catch {
      // ignore warm-up failures
    }
  }

  return isUsableCookieValue(raw) ? String(raw).trim().replace(/^["']|["']$/g, '') : '';
}

export async function apiFetch(path, options = {}) {
  await hydrateSessionCookies();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const method = (options.method || 'GET').toUpperCase();

  // IMPORTANT: never set a Cookie request header from JS.
  // RN already injects cookies from NSHTTPCookieStorage when credentials:'include'.
  // Adding Cookie via JS uses addValue() and can produce a comma-joined Cookie header
  // that Django rejects — which is why /auth/me returned 401 after a successful login.
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  delete headers.Cookie;
  delete headers.cookie;

  // Django session auth requires CSRF on unsafe methods (POST/PATCH/DELETE).
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = await getCsrfToken();
    if (csrf) {
      headers['X-CSRFToken'] = csrf;
      headers['X-CSRF-Token'] = csrf;
    }
    // Helps Django CSRF origin checks on some deployments
    headers.Referer = `${API_BASE}/`;
  }

  console.log('[API] →', method, url, {
    nativeSession: lastSessionMeta,
    hasCsrf: Boolean(headers['X-CSRFToken']),
    headers: redactSensitive(headers),
    body: options.body ? redactSensitive(options.body) : undefined,
  });

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    console.log('[API] ✕', method, url, error?.message || error);
    const hint =
      !API_BASE || API_BASE.includes('your-domain.com')
        ? ' Set a real API_BASE in src/config.js.'
        : ` Check API_BASE (${API_BASE}) and that the server is reachable from this device.`;
    throw new Error(`Network request failed.${hint}`);
  }

  await ingestSetCookie(response, url);
  const sessionMeta = await persistNativeSession();

  let responseBody;
  try {
    const clone = response.clone();
    const text = await clone.text();
    try {
      responseBody = text ? JSON.parse(text) : null;
    } catch {
      responseBody = text;
    }
  } catch {
    responseBody = '[unreadable body]';
  }

  console.log('[API] ←', method, url, response.status, {
    nativeSession: sessionMeta,
    body: redactSensitive(responseBody),
  });

  return response;
}
