export interface StoredAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  themePreference?: "light" | "dark" | null;
  [key: string]: unknown;
}

const AUTH_CHANGED_EVENT = "autominutes:auth-changed";

let cachedRawUser: string | null = null;
let cachedUser: StoredAuthUser | null = null;

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    // Citeste expirarea tokenului JWT.
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function isAccessTokenValid(token = getAccessToken()) {
  // Blocheaza tokenurile expirate.
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now() + 30_000;
}

export function getStoredUser(): StoredAuthUser | null {
  const raw = localStorage.getItem("user");
  if (raw !== cachedRawUser) {
    // Refoloseste userul deja parsat.
    cachedRawUser = raw;
    try {
      cachedUser = raw ? (JSON.parse(raw) as StoredAuthUser) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

export function setAuthSession(token: string, user: StoredAuthUser) {
  // Salveaza sesiunea curenta.
  localStorage.setItem("accessToken", token);
  localStorage.setItem("user", JSON.stringify(user));
  cachedRawUser = JSON.stringify(user);
  cachedUser = user;
  notifyAuthChanged();
}

export function clearAuthSession() {
  // Curata sesiunea locala.
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  cachedRawUser = null;
  cachedUser = null;
  notifyAuthChanged();
}

export function subscribeAuthSession(callback: () => void) {
  // Sincronizeaza taburile deschise.
  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_CHANGED_EVENT, callback);
  };
}
